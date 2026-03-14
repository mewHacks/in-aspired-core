// Room controller — handles study room listing, creation, joining, eligibility, and RIASEC-based room scoring
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import Room, { IRoomDocument } from '../models/Room';
import Participation from '../models/Participation';
import Result from '../models/Result';
import * as store from '../socket/roomStateStore';
import { logActivity, buildMeta } from '../middleware/activityLogger';

// Define minimum participation count to be eligible for creating a room
const CREATION_THRESHOLD = 3;

// Helper function to check if user is eligible to create a room
const checkEligibility = async (userId: string): Promise<{ eligible: boolean, count: number }> => {

    // Count distinct rooms joined as participation records
    // Must be at least 25 minutes to count
    const count = await Participation.countDocuments({
        userId,
        durationMin: { $gte: 25 }
    });

    return {
        eligible: count >= CREATION_THRESHOLD, count
    };
};

// List all active rooms with optional filters and RIASEC-based recommendation scoring
export const getRooms = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Extract optional query params for filtering
        const { search, type, level, courseId } = req.query;

        // Base query is only active rooms
        const query: any = { isActive: true };

        // Add filters based on query parameters
        // Text search for room name
        if (search) {
            const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.name = { $regex: escaped, $options: 'i' };
        }
        // Filter by room type (public/private)
        if (type) {
            query.type = type;
        }
        // Filter by educational level
        if (level && level !== 'All Levels') {
            query.level = level;
        }
        // Filter by course ID
        if (courseId) {
            query.courseId = courseId;
        }

        // Fetch rooms from db — exclude coverImage (potentially large base64) from list for performance.
        // It is only needed on the room detail page, which fetches a single room by ID.
        const rooms = await Room.find(query)
            .select('-coverImage')
            .populate('ownerId', 'name') // avatar not displayed in list cards
            .sort({ createdAt: -1 }); // Newest results first

        // Add live member count to each room
        // Fetch from Redis Socket Store instead of stale MongoDB Collection
        const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
            const memberCount = await store.getRoomUserCount(room._id.toString());
            return {
                ...room.toObject(),
                memberCount
            };
        }));

        // Score rooms by RIASEC domain overlap
        let enrichedRooms = roomsWithCounts;

        if (req.user) {
            // Fetch user's latest personality test result
            const latestResult = await Result.findOne({ userId: req.user.id })
                .sort({ createdAt: -1 })
                .limit(1);

            if (latestResult && latestResult.topDomains && latestResult.topDomains.length > 0) {
                // Extract user's top domain IDs (up to 3)
                const userTopDomains = latestResult.topDomains
                    .slice(0, 3)
                    .map((d: any) => d.id)
                    .filter(Boolean);

                // Score each room by direct domain overlap
                enrichedRooms = roomsWithCounts.map(room => {
                    let matchScore = 0;

                    if (room.domainIds && room.domainIds.length > 0) {
                        for (const domainId of room.domainIds) {
                            const rank = userTopDomains.indexOf(domainId);
                            if (rank !== -1) {
                                matchScore += (3 - rank); // Top domain = 3pts, 2nd = 2pts, 3rd = 1pt
                            }
                        }
                    }

                    return {
                        ...room,
                        matchScore,
                        isRecommended: matchScore > 0
                    };
                });

                // Sort by matchScore descending
                enrichedRooms.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
            }
        }

        // Return enriched room list
        res.json(enrichedRooms);

    } catch (error) { // Error handling
        console.error('Get Rooms Error:', error);
        res.status(500).json({ message: 'Failed to fetch rooms' });
    }
};

// Check if the current user is eligible to create a room based on participation count
export const getEligibility = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // User must be logged in
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check participation count
        const { eligible, count } = await checkEligibility(req.user.id);

        // Allow admin bypass (case-insensitive)
        const isAdmin = req.user.role?.toLowerCase() === 'admin';

        // Return eligibility info
        res.json({
            eligible: eligible || isAdmin,
            count,
            threshold: CREATION_THRESHOLD
        });
    } catch (error) { // Error handling
        console.error('Eligibility Error:', error);
        res.status(500).json({ message: 'Failed to check eligibility' });
    }
};

// Create a new study room after verifying eligibility (admin bypass allowed)
export const createRoom = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // User must be logged in
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check if user is eligible to create a room
        const { eligible } = await checkEligibility(req.user.id);
        const isAdmin = req.user.role?.toLowerCase() === 'admin';

        // Strict enforcement (allow admin override)
        if (!eligible && !isAdmin) {
            return res.status(403).json({
                message: `You need to participate in at least ${CREATION_THRESHOLD} study sessions to create a room.`
            });
        }

        // Extract room details from request body
        const { name, description, type, joinCode, maxParticipants, level, courseId, domainIds, coverImage, sessionDuration } = req.body;

        // Create room document
        const newRoom = new Room({
            name,
            description,
            type,
            joinCode: type === 'private' ? joinCode : undefined, // Only private rooms require join codes
            maxParticipants: maxParticipants || 10, // Default to 10 if not specified
            level,
            courseId,
            domainIds,
            coverImage,
            sessionDuration: sessionDuration || 25, // Default to 25 mins
            ownerId: req.user.id // Set owner to creator
        });

        // Save room to database
        const savedRoom = await newRoom.save();

        // Log activity with WebSocket broadcast
        await logActivity({
            userId: req.user.id,
            activity: 'Created a study room',
            type: 'Room',
            ip: req.ip,
            meta: buildMeta(req.user, {
                roomId: savedRoom._id.toString(),
                roomName: name,
                roomType: type,
                sessionDuration
            })
        });

        // Return newly created room
        res.status(201).json(savedRoom);

    } catch (error) { // Error handling
        console.error('Create Room Error:', error);
        res.status(500).json({ message: 'Failed to create room' });
    }
};

// Fetch a single room's details including live member count from Redis
export const getRoom = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Find room and attach owner info
        const room = await Room.findById(id).populate('ownerId', 'name avatar');

        // Return error message if room not found
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Count current members from Redis
        const memberCount = await store.getRoomUserCount(room._id.toString());

        // Return room with member count
        res.json({
            ...room.toObject(),
            memberCount
        });
    } catch (error) { // Error handling
        res.status(500).json({ message: 'Failed to fetch room' });
    }
};

// Validate join permissions for a room (join code, capacity) before socket connection
export const joinRoom = async (req: AuthenticatedRequest, res: Response) => {
    try {

        // This endpoint validates entry conditions
        // Actual real-time presence handled by sockets

        const { id } = req.params;
        const { joinCode } = req.body;

        // Fetch room
        const room = await Room.findById(id);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        // Check private room join code
        if (room.type === 'private' && room.joinCode !== joinCode) {
            // Allow room owner to bypass join code
            if (req.user?.id !== room.ownerId.toString()) {
                return res.status(403).json({ message: 'Invalid join code' });
            }
        }

        // Check capacity from Redis
        const currentMembers = await store.getRoomUserCount(id);
        if (currentMembers >= room.maxParticipants) {
            return res.status(409).json({ message: 'Room is full' });
        }

        // Log activity with WebSocket broadcast (optional - might be too frequent)
        if (req.user) {
            await logActivity({
                userId: req.user.id,
                activity: 'Joined a study room',
                type: 'Room',
                ip: req.ip,
                meta: buildMeta(req.user, {
                    roomId: id,
                    roomName: room.name
                })
            });
        }

        // If all checks pass, allow join
        res.json({ message: 'Join allowed', roomId: id });

    } catch (error) { // Error handling
        res.status(500).json({ message: 'Join failed' });
    }
};
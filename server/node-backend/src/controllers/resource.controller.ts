import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Resource, { ResourceStatus } from '../models/Resource';
import CuratedResource from '../models/CuratedResource';
import Room from '../models/Room';

// FUNCTION 1: getRecommendedResources
// This runs when someone opens the Resources panel in a virtual room.
// It fetches the "recommended" resources from our curated library (not user-uploaded ones - those are separate).
// It filters by the room's education level (e.g. Diploma) and study domain (e.g. Computing) so results are relevant.
export const getRecommendedResources = async (req: AuthRequest, res: Response) => {
    try {
        // Pull the "domain" and "level" from the URL query string
        // Extract query parameters for filtering
        const { domain, level } = req.query;

        // Start with a base filter: only show resources that are published (visible to users)
        // We use "any" type here because we'll be adding fields to this object dynamically below
        const filter: any = { isPublished: true };

        // If a domain was provided AND it's not just "General", add it to the filter
        // We use a case-insensitive regex so "computing" and "Computing" both match
        if (domain && domain !== 'General') {
            filter.domainIds = { $regex: new RegExp(`^${String(domain).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
        }

        // If a level was provided AND it's not just "General", filter by that level too
        if (level && level !== 'General') {
            filter.levels = level;
        }

        // Query the CuratedResource collection with our filter, max 10 results
        let resources = await CuratedResource.find(filter).limit(10);

        // Log to server console so we can debug if something looks wrong
        console.log(`Found ${resources.length} resources for filter:`, JSON.stringify(filter));

        // Send the results back to the frontend as JSON
        res.status(200).json(resources);

    } catch (error) {
        // If anything goes wrong (database error, etc.), log it and tell the frontend
        console.error('Error fetching recommended resources:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
};

// FUNCTION 2: getRoomResources
// This fetches all the resources that users have uploaded during a specific virtual room session.
// It supports pagination so if there are 100 resources, we don't send all 100 at once - we send 20 at a time.
// Only "active" resources are shown (hidden/reported ones are excluded).
// to improve performance with large lists
export const getRoomResources = async (req: AuthRequest, res: Response) => {
    try {
        // Get the room ID from the URL (e.g. /api/resources/abc123)
        const { roomId } = req.params;

        // Read pagination settings from query string, use defaults if not provided
        // (default to page 1, 20 items per page)
        const page = parseInt(req.query.page as string) || 1;   // Which page? Default: page 1
        const limit = parseInt(req.query.limit as string) || 20; // How many per page? Default: 20
        const skip = (page - 1) * limit; // How many documents to skip (for pagination math)

        // Only fetch resources that belong to this room AND are still active (not hidden/reported)
        const filter = { roomId, status: ResourceStatus.ACTIVE };

        // Run two database queries at the same time (faster than one after the other):
        // 1. Get the actual resource documents
        // 2. Count how many total documents match the filter (for pagination info)
        const [resources, total] = await Promise.all([
            Resource.find(filter)
                .populate('uploaderId', 'name avatar') // Replace uploaderId with the actual user's name & avatar
                .sort({ createdAt: -1 })               // Newest resources appear first
                .skip(skip)                            // Skip documents from previous pages
                .limit(limit),                         // Only return this many documents
            Resource.countDocuments(filter)            // Total count for pagination
        ]);

        // Send back the resources plus pagination metadata
        // The frontend uses "hasMore" to know whether to show a "Load More" button
        res.json({
            data: resources,
            meta: {
                page,
                limit,
                total,
                hasMore: total > skip + resources.length // True if there are more pages after this one or Helper flag for frontend "Load More"
            }
        });

    } catch (error) {
        // Log error and return server error response
        console.error('Get Resources Error:', error);
        res.status(500).json({ message: 'Failed to fetch resources' });
    }
};

// FUNCTION 3: addResource
// This runs when a user uploads a new resource to a room.
// It has two safety checks before saving:
//   1. Rate limit - max 5 uploads per 10 minutes (to prevent spam)
//   2. Banned words - rejects titles/descriptions with bad content (basic keyword filtering)
export const addResource = async (req: AuthRequest, res: Response) => {
    try {
        // Get the room ID from the URL
        const { roomId } = req.params;

        // Get all the resource details the user submitted
        const { title, type, url, description, tags, scope } = req.body;

        // Get the ID of the currently logged-in user (set by auth middleware)
        const userId = req.user?.id;

        // Make sure the room actually exists before we do anything else
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        // --- RATE LIMIT CHECK ---
        // Count how many resources this user has uploaded in the last 10 minutes
        // Limits 5 uploads per 10 minutes per user in this room
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // Current time minus 10 minutes
        const recentUploads = await Resource.countDocuments({
            roomId,
            uploaderId: userId,
            createdAt: { $gte: tenMinutesAgo } // Only count uploads from the last 10 minutes
        });

        // If they've already uploaded 5 or more, block them with a 429 (Too Many Requests)
        if (recentUploads >= 5) {
            return res.status(429).json({ message: 'Upload limit reached. Try again in 10 minutes.' });
        }

        // --- BANNED WORDS CHECK ---
        // List of words that are not allowed in resource titles or descriptions
        const bannedWords = [
            'badword', 'explicit', 'spam', 'nsfw', 'porn', 'violence', 'hate',
            'racist', 'gamble', 'casino', 'drug', 'kill', 'suicide'
        ];

        // Check if the title OR description contains any banned word (case-insensitive)
        const hasBannedWord = bannedWords.some(word =>
            title.toLowerCase().includes(word) ||
            description?.toLowerCase().includes(word)
        );

        if (hasBannedWord) {
            return res.status(400).json({ message: 'Content contains restricted keywords.' });
        }

        // --- CREATE AND SAVE THE RESOURCE ---
        const newResource = new Resource({
            roomId,
            uploaderId: userId,
            title,
            type,        // 'link', 'pdf', or 'image'
            url,         // The actual URL or base64 string for files
            description,
            tags,
            scope: scope || 'session', // Default to 'session' scope if not specified
            status: ResourceStatus.ACTIVE // Starts as active (visible to everyone in the room)
        });

        // Save to MongoDB
        await newResource.save();

        // After saving, fetch the uploader's name & avatar so the frontend can display it immediately
        await newResource.populate('uploaderId', 'name avatar');

        // Return the newly created resource with a 201 (Created) status
        res.status(201).json(newResource);

    } catch (error) {
        // Log error and return server error response
        console.error('Add Resource Error:', error);
        res.status(500).json({ message: 'Failed to add resource' });
    }
};

// FUNCTION 4: reportResource
// This runs when a user clicks the flag button on a resource.
// Each report is stored inside the resource document itself.
// If 2 or more different users report the same resource,
// it gets automatically hidden from the room.
// Admins can then review it in the Report Center page.
export const reportResource = async (req: AuthRequest, res: Response) => {
    try {
        // Get the resource ID from the URL
        const { resourceId } = req.params;

        // Get the currently logged-in user's ID
        const userId = req.user?.id;

        // Get the reason the user selected (e.g. "Inappropriate content", "Spam", etc.)
        const { reason } = req.body;

        // Try to find the resource in the database
        const resource = await Resource.findById(resourceId);

        // If it doesn't exist, return a 404 error
        if (!resource) return res.status(404).json({ message: 'Resource not found' });

        // Check if this user has already reported this resource before
        // We do this to prevent someone from reporting the same thing multiple times
        const alreadyReported = resource.reports.find(r => r.userId.toString() === userId);
        if (alreadyReported) {
            return res.status(400).json({ message: 'You have already reported this resource.' });
        }

        // Add this user's report to the reports array inside the resource document
        resource.reports.push({
            userId: userId as any,                        // Who reported it
            reason: reason || 'Inappropriate content',   // Why they reported it (fallback if no reason given)
            createdAt: new Date()                         // When they reported it
        });

        // If 2 or more people have now reported this resource, hide it automatically
        // This means it won't show up in the room anymore until an admin reviews it
        if (resource.reports.length >= 2) {
            resource.status = ResourceStatus.HIDDEN;
        }

        // Save the updated resource back to MongoDB
        await resource.save();

        // Tell the user their report was received
        res.json({ message: 'Resource reported. Thank you for keeping the community safe.' });

    } catch (error) {
        console.error('Report Resource Error:', error);
        res.status(500).json({ message: 'Failed to report resource' });
    }
};

// FUNCTION 5: getReportedResources  (for Admin)
// It fetches all resources that have been reported by at least one user.
// The admin sees this in the "Resource Reports" tab inside the Report Center page.
// It also returns summary stats (how many hidden, under review, etc.)
export const getReportedResources = async (req: AuthRequest, res: Response) => {
    try {
        // Read pagination settings from the query string
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Optional: filter by a specific status (e.g. only show "hidden" ones)
        const statusFilter = req.query.status as string;

        // Build the filter - we ONLY want resources that have at least 1 report
        // '$exists: true' means the first element of the reports array must exist
        const filter: any = { 'reports.0': { $exists: true } };

        // If the admin chose to filter by status, add that to the filter too
        if (statusFilter && statusFilter !== 'all') {
            filter.status = statusFilter;
        }

        // Run 2 queries at the same time:
        // 1. Fetch the actual reported resource documents
        // 2. Count total matches for pagination
        const [resources, total] = await Promise.all([
            Resource.find(filter)
                .populate('uploaderId', 'name email avatar') // Show uploader's name & email to admin
                .populate('roomId', 'name')                  // Show which room this resource was in
                .populate('reports.userId', 'name email')    // Show who filed each report
                .sort({ createdAt: -1 })                     // Newest reports first
                .skip(skip)
                .limit(limit),
            Resource.countDocuments(filter)
        ]);

        // Also calculate summary stats for the stat cards at the top of the page
        // We run all 3 counts at the same time for speed
        const [totalReported, hiddenCount, underReviewCount] = await Promise.all([
            Resource.countDocuments({ 'reports.0': { $exists: true } }),                          // Total with any reports
            Resource.countDocuments({ 'reports.0': { $exists: true }, status: ResourceStatus.HIDDEN }),        // How many are hidden
            Resource.countDocuments({ 'reports.0': { $exists: true }, status: ResourceStatus.UNDER_REVIEW }),  // How many are under review
        ]);

        // Send everything back to the frontend
        res.json({
            data: resources,
            meta: {
                page,
                limit,
                total,
                hasMore: total > skip + resources.length
            },
            stats: {
                totalReported,
                hidden: hiddenCount,
                underReview: underReviewCount,
                active: totalReported - hiddenCount - underReviewCount // Still active but reported
            }
        });

    } catch (error) {
        console.error('Get Reported Resources Error:', error);
        res.status(500).json({ message: 'Failed to fetch reported resources' });
    }
};

// FUNCTION 6: dismissReport (for Admin)
// Admin clicks "Dismiss" on a reported resource.
// This means the admin reviewed it and decided it's fine so we clear all the reports and make it visible again (active).
export const dismissReport = async (req: AuthRequest, res: Response) => {
    try {
        // Get the resource ID from the URL
        const { resourceId } = req.params;

        // Find the resource
        const resource = await Resource.findById(resourceId);

        // If it doesn't exist, return 404
        if (!resource) return res.status(404).json({ message: 'Resource not found' });

        // Clear all the reports - the admin has decided it's not a problem
        resource.reports = [];

        // Set status back to active so it shows up in the room again
        resource.status = ResourceStatus.ACTIVE;

        // Save changes to the database
        await resource.save();

        // Tell the admin it worked
        res.json({ message: 'Reports dismissed. Resource restored to active.' });

    } catch (error) {
        console.error('Dismiss Report Error:', error);
        res.status(500).json({ message: 'Failed to dismiss report' });
    }
};

// FUNCTION 7: deleteResource (for Admin)
// Admin clicks "Delete" on a reported resource.
// This permanently removes the resource from the database.
// Use this when the resource is genuinely harmful/inappropriate.
export const deleteResource = async (req: AuthRequest, res: Response) => {
    try {
        // Get the resource ID from the URL
        const { resourceId } = req.params;

        // Check the resource exists first
        const resource = await Resource.findById(resourceId);

        // If not found, return 404
        if (!resource) return res.status(404).json({ message: 'Resource not found' });

        // Permanently delete it from the database - this cannot be undone!
        await Resource.findByIdAndDelete(resourceId);

        // Tell the admin deletion was successful
        res.json({ message: 'Resource deleted successfully.' });

    } catch (error) {
        console.error('Delete Resource Error:', error);
        res.status(500).json({ message: 'Failed to delete resource' });
    }
};
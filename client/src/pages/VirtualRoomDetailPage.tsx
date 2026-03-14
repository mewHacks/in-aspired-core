import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Room } from '../types';
import { httpClient } from '../services/httpClient';
import { Users, Clock, Shield, Play, Lock, ChevronLeft } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Main virtual room detail page which displays a single virtual room
const VirtualRoomDetailPage: React.FC = () => {
    const { t } = useTranslation();

    // Read URL and navigate 
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Extract code from query param (?code=ABC123)
    const codeFromUrl = searchParams.get('code') || '';

    // Show toast notifications
    const toast = useToast();

    // State management
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState(codeFromUrl);
    const [joining, setJoining] = useState(false);
    const [isAskingHost, setIsAskingHost] = useState(false);
    const [waitingForApproval, setWaitingForApproval] = useState(false);
    const [pendingJoinRequests, setPendingJoinRequests] = useState<any[]>([]);
    const hasAttemptedAutoJoin = useRef(false);

    // Socket and auth context
    const { socket } = useSocket();
    const { user } = useAuth();

    // Fetch room details on mount
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                // Get room data from API
                const res = await httpClient(`/api/rooms/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setRoom(data);
                } else {
                    // Handle 404 - Redirect if room missing
                    toast.error(t('rooms.detail.toast.notFound'));
                    navigate('/rooms');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchRoom();
    }, [id, navigate, toast]);

    // Auto-join if code is present in URL (for private rooms with invite link)
    useEffect(() => {
        if (!room || !codeFromUrl || !user || hasAttemptedAutoJoin.current) return;

        // Only auto-join for private rooms when code is in URL
        if (room.type === 'private') {
            hasAttemptedAutoJoin.current = true;
            // Slight delay to ensure component is fully mounted
            const timer = setTimeout(() => {
                handleAutoJoin();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [room, codeFromUrl, user]);

    // Check if current user is the room host
    const isHost = room && user && (
        (typeof room.ownerId === 'string' && room.ownerId === user.id) ||
        (typeof room.ownerId === 'object' && room.ownerId._id === (user.id || user._id))
    );

    // Handle auto-join with code from URL (for invite links)
    const handleAutoJoin = async () => {
        if (!room || !codeFromUrl) return;
        setJoining(true);

        try {
            const res = await httpClient(`/api/rooms/${id}/join`, {
                method: 'POST',
                body: JSON.stringify({ joinCode: codeFromUrl })
            });

            if (res.ok) {
                toast.success(t('rooms.detail.toast.joining'));
                navigate(`/rooms/${id}/meet`);
            } else {
                const err = await res.json();
                toast.error(err.message || t('rooms.detail.toast.invalidCode'));
            }
        } catch (error) {
            toast.error(t('rooms.detail.toast.networkError'));
        } finally {
            setJoining(false);
        }
    };

    // Handle join action
    const handleJoin = async () => {
        if (!room) return;
        setJoining(true);

        try {
            // Verify entry requirements (code check for private rooms)
            const res = await httpClient(`/api/rooms/${id}/join`, {
                method: 'POST',
                body: JSON.stringify({ joinCode })
            });

            if (res.ok) {
                // If success, navigate to actual meeting interface
                navigate(`/rooms/${id}/meet`);
            } else { // If failed, show error notifications
                const err = await res.json();
                toast.error(err.message || t('rooms.detail.toast.failJoin'));
            }
        } catch (error) {
            toast.error(t('rooms.detail.toast.networkError'));
        } finally {
            setJoining(false);
        }
    };

    // Handles when user ask host for join code action
    const handleAskHost = () => {

        // Check if socket and room details are missing
        if (!socket || !id || !user || !room) return;

        // Update UI state to indicate that request is sent and waiting for approval
        setIsAskingHost(true);
        setWaitingForApproval(true);

        // Broadcast ask-to-join event to server
        socket.emit('ask-to-join', {
            roomId: id,
            user: { name: user.name, id: user.id || user._id }
        });
    };

    // Register host presence and listen for join requests when on detail page
    useEffect(() => {
        if (!socket || !id || !room || !user) return;

        // Check if current user is the room host
        const hostCheck = room && user && (
            (typeof room.ownerId === 'string' && room.ownerId === user.id) ||
            (typeof room.ownerId === 'object' && room.ownerId._id === (user.id || user._id))
        );

        if (!hostCheck) return;

        socket.emit('register-host-presence', id);

        socket.on('join-request', (data: { requesterName: string, requesterId: string, requesterSocketId: string }) => {
            setPendingJoinRequests(prev => [...prev, data]);
            toast.info(`${data.requesterName} wants to join`);
        });

        return () => {
            socket.off('join-request');
        };
    }, [socket, id, room, user]); // Re-run if socket, room, or user changes

    // Approve or deny a join request from the detail page
    const handleApproveJoin = (req: any, approved: boolean) => {
        if (!socket || !id || !room || !user) return;
        socket.emit('respond-to-join', {
            requesterSocketId: req.requesterSocketId,
            requesterId: req.requesterId,
            requesterName: req.requesterName,
            roomId: id,
            roomName: room.name,
            hostName: user.name,
            approved,
        });
        setPendingJoinRequests(prev => prev.filter(r => r.requesterSocketId !== req.requesterSocketId));
    };

    // Effect hook to listen for join approval/denial
    useEffect(() => {

        // Check if socket is missing
        if (!socket) return;

        // Listen for the host's response (approved or denied)
        socket.on('join-response', (data: { approved: boolean }) => {

            // Stop showing "waiting for approval" and loading UI state 
            setWaitingForApproval(false);
            setIsAskingHost(false);

            // If approved, show success notifications and navigate to room
            if (data.approved) {
                toast.success(t('rooms.detail.toast.approved'));
                navigate(`/rooms/${id}/meet`);
            } else { // If not approved, show error notifications
                toast.error(t('rooms.detail.toast.denied'));
            }
        });

        // Listen for server-side errors related to asking to join
        socket.on('ask-join-error', (data: { message: string }) => {

            // Stop showing loading UI and "waiting for approval" state
            setIsAskingHost(false);
            setWaitingForApproval(false);

            // Show error notifications
            toast.error(data.message,);
        });

        // Listen for server-side confirmation that the request was sent successfully
        socket.on('ask-join-sent', () => {
            toast.info(t('rooms.detail.toast.reqSent'));
        });

        // Cleanup function during unmount
        return () => {
            socket.off('join-response');
            socket.off('ask-join-error');
            socket.off('ask-join-sent');
        };
    }, [socket, id, navigate, toast]); // Re run effect if any of these changes

    // Show loading state
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center dark:bg-gray-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div></div>;
    }

    // Show not found state
    if (!room) return null;

    return (
        // Render JSX
        <div className="min-h-screen bg-white dark:bg-gray-950">

            {/* Pending join requests overlay (host only) */}
            {isHost && pendingJoinRequests.length > 0 && (
                <div className="fixed top-24 right-4 z-50 w-80 space-y-2">
                    {pendingJoinRequests.map((req) => (
                        <div key={req.requesterSocketId} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-xl border border-indigo-100 dark:border-indigo-900 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                    {req.requesterName[0]}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{req.requesterName}</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">{t('virtualRoom.wantsToJoin')}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleApproveJoin(req, true)}
                                    className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700"
                                >
                                    {t('virtualRoom.approve')}
                                </button>
                                <button
                                    onClick={() => handleApproveJoin(req, false)}
                                    className="flex-1 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 text-xs font-bold py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700"
                                >
                                    {t('virtualRoom.deny')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Navigation bar */}
            <Navbar />

            {/* Main content */}
            <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">

                <button
                    onClick={() => navigate('/rooms')}
                    className="flex items-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t('rooms.detail.backBtn')}
                </button>

                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden grid md:grid-cols-5">

                    {/* Header Image */}
                    <div className="md:col-span-5 h-48 bg-slate-50 dark:bg-gray-800 relative">
                        {room.coverImage ? (
                            <img
                                src={room.coverImage}
                                alt={room.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950"></div>
                        )}
                    </div>

                    {/* Left: Info */}
                    <div className="md:col-span-3 p-8 sm:p-12">
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            {/* Type Badge */}
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${room.type === 'private' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                {room.type}
                            </span>

                            {/* Level Badge */}
                            <span className="inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 text-xs font-medium rounded-lg">
                                {room.level}
                            </span>

                            {/* Domain Badge */}
                            {room.domainIds && room.domainIds.length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 text-xs font-medium rounded-lg capitalize">
                                    {room.domainIds[0]}
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 dark:text-white mb-6">
                            {room.name}
                        </h1>

                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-8">
                            {room.description}
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                <span>{t('rooms.detail.enrolled', { enrolled: room.memberCount || 0, max: room.maxParticipants })}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                <span>{t('rooms.detail.activeSession')}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <Shield className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                <span>{t('rooms.detail.hostedBy', { host: room.ownerId.name })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Action */}
                    <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800 p-8 sm:p-12 flex flex-col justify-center border-l border-gray-100 dark:border-gray-700">

                        <div className="text-center mb-8">
                            <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mx-auto mb-4 flex items-center justify-center">
                                {room.type === 'private' ? <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /> : <Play className="w-8 h-8 text-indigo-600 dark:text-indigo-400 ml-1" />}
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-xl">{t('rooms.detail.readyTitle')}</h3>
                        </div>

                        {/* Private room join options */}
                        {room.type === 'private' && (
                            <div className="mb-4 space-y-3">
                                <div className="flex justify-between items-center mb-2">

                                    {/* Room entry code */}
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rooms.detail.entryCode')}</label>

                                    {/* Ask host for join code button (only for non-hosts) */}
                                    {!isHost && !waitingForApproval && (
                                        <button
                                            onClick={handleAskHost}
                                            disabled={isAskingHost}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:underline disabled:opacity-50"
                                        >
                                            {isAskingHost ? t('rooms.detail.askSending') : t('rooms.detail.askCode')}
                                        </button>
                                    )}
                                </div>

                                {/* Join code input */}
                                <Input
                                    type="text"
                                    placeholder={t('rooms.detail.enterCodePlaceholder')}
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    className="text-center tracking-widest font-mono dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                />

                                {/* Waiting for approval UI */}
                                {waitingForApproval && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{t('rooms.detail.waitingApproval')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Join button */}
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full justify-center text-lg h-12"
                            onClick={handleJoin}
                            disabled={joining || (room.type === 'private' && !isHost && !joinCode)}
                        >
                            {joining ? t('rooms.detail.joiningBtn') : t('rooms.detail.joinBtn')}
                        </Button>

                        {/* Joining terms label */}
                        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
                            {t('rooms.detail.terms')}
                        </p>

                    </div>

                </div>

            </main>
            <Footer />
        </div>
    );
};

export default VirtualRoomDetailPage;
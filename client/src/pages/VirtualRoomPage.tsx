import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../contexts/ConfirmContext';
import { Button } from '../components/ui/Button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, BookOpen, Users, Pencil, HelpCircle, Clock, Send, Maximize, Minimize, Lock, Settings, X, ListTodo, Music, Share2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { httpClient } from '../services/httpClient';
import { Room } from '../types';
import Whiteboard from '../components/rooms/Whiteboard';
import HostControlsModal from '../components/room/HostControlsModal';
import ResourcesPanel from '../components/room/ResourcesPanel';
import TodoPanel from '../components/room/TodoPanel';
import MusicPlayer from '../components/room/MusicPlayer';
import ShareRoomPanel from '../components/room/ShareRoomPanel';
import { useWebRTC } from '../hooks/useWebRTC';

// Helper video player component (WebRTC video rendering) to prevent video flicker on re-renders (like timer updates)
const VideoPlayer: React.FC<{ stream: MediaStream | null, muted?: boolean, isMirrored?: boolean }> = ({ stream, muted = false, isMirrored = false }) => {

    // Video element ref, WebRTC streams must be assigned via video.srcObject
    const videoRef = React.useRef<HTMLVideoElement>(null);

    // Connects WebRTC stream to video element on stream changes to show live video on screen
    React.useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        // Render video element
        <video
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            className={`w-full h-full object-cover ${isMirrored ? 'transform -scale-x-100' : ''}`}
        />
    );
};

// Main virtual room page component
const VirtualRoomPage: React.FC = () => {

    // Get room ID from URL: /rooms/:id
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { confirm: confirmAction } = useConfirm();

    // Navigation, auth context and socket context
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket, connected } = useSocket();

    // Toast message hook
    const toast = useToast();

    // Room state
    const [room, setRoom] = useState<Room | null>(null);

    // Determines which sidebar tab is active (chat, resources, or todo)
    const [activeTab, setActiveTab] = useState<'chat' | 'resources' | 'todo'>('chat');

    // Local state for microphone and camera toggles, controls both UI and WebRTC 
    const [micOn, setMicOn] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);

    // Custom hook managing WebRTC: local stream, remote peers, toggles
    const { userStream, peers, toggleAudio, toggleVideo, streamReady } = useWebRTC(id || '', { micOn: false, cameraOn: false });

    // Tracks whether user is in full screen
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Room admin settings (Local state)
    const [roomSettings, setRoomSettings] = useState({
        allowCamera: true,
        allowAudio: true,
        allowWhiteboard: true
    });

    // Host controls modal
    const [showHostControls, setShowHostControls] = useState(false);

    // Participants modal (for non-host users)
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);

    // Help modal state
    const [showHelpModal, setShowHelpModal] = useState(false);

    // Share panel modal state
    const [showSharePanel, setShowSharePanel] = useState(false);

    // Show pending join requests (Host only)
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    // Track detailed user info for participants (Used for Video Grid + Controls)
    const [participants, setParticipants] = useState<Map<string, any>>(new Map());

    // Initial mute is handled by the hook now via config
    useEffect(() => {
    }, []);

    // Chooses between video grid view or whiteboard view
    const [activeView, setActiveView] = useState<'grid' | 'whiteboard'>('grid');

    // resourceTab removed as ResourcesPanel handles its own view

    // Input field for typing chat messages
    const [chatMessage, setChatMessage] = useState('');

    // Stores chat messages (default is a welcome system message)
    const [messages, setMessages] = useState<{ user: string, text: string, time: string, senderId?: string }[]>([
        { user: 'System', text: 'Welcome to the study room!', time: 'Now', senderId: 'system' }
    ]);

    // Ref for auto-scrolling chat
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll effect
    useEffect(() => {
        if (activeTab === 'chat' && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    // Pomodoro timer state, countdown in seconds and running status
    const [timeLeft, setTimeLeft] = useState(1500); // 25 mins
    const [isTimerRunning, setIsTimerRunning] = useState(false); // Used to show active status
    const [isSessionEnded, setIsSessionEnded] = useState(false); // Used to show session ended modal

    // Track the active session host (socket ID)
    const [currentHostSocketId, setCurrentHostSocketId] = useState<string | null>(null);
    const [activeHostInfo, setActiveHostInfo] = useState<any>(null);

    // Checks host privilege (based on active session host, NOT just DB owner)
    const isHost = socket && socket.id === currentHostSocketId;

    // Effects
    useEffect(() => {
        // Fetch room info details on mount or when ID changes
        const fetchRoom = async () => {
            try {
                const res = await httpClient(`/api/rooms/${id}`);
                if (res.ok) { // If room exists, set room state
                    const data = await res.json();
                    setRoom(data);

                    // Initialize settings from room data
                    setRoomSettings({
                        allowCamera: data.allowCamera !== false, // Default true if undefined
                        allowAudio: data.allowAudio !== false,
                        allowWhiteboard: data.allowWhiteboard !== false
                    });
                } else { // If room doesn't exist, redirect to rooms page
                    navigate('/rooms');
                }
            } catch (error) { // Network error handling
                console.error(error);
            }
        };
        fetchRoom();
    }, [id, navigate]);

    // Fullscreen listener that updates isFullScreen whenever the browser enters/exits fullscreen
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    // Join room on mount and handle user events
    useEffect(() => {
        if (!socket || !connected || !id || !user || !room) return;

        // Notify the server that this user joined the room
        socket.emit('join-room', {
            roomId: id,
            duration: room?.sessionDuration, // Pass default duration for init
            user: {
                _id: user.id || user._id,
                name: user.name,
                email: user.email
            }
        });

        // Listen for snapshot of current users
        const handleRoomUsersSnapshot = (users: Array<{ socketId: string, info: any }>) => {
            const pMap = new Map<string, any>(); // Converts array to map for fast lookups
            users.forEach(u => pMap.set(u.socketId, u.info));
            setParticipants(pMap);
        };
        socket.on('room-users-snapshot', handleRoomUsersSnapshot);

        // Listen for new user joining
        const handleUserJoinedRoom = (newUser: any) => {
            setParticipants(prev => {
                const next = new Map(prev);
                next.set(newUser.socketId, newUser);
                return next;
            });
            toast.success(t('virtualRoom.toast.joined', { name: newUser.name, defaultValue: `${newUser.name} joined the room` }));
        };
        socket.on('user-joined-room', handleUserJoinedRoom);

        // Listen for user leaving
        const handleUserLeftRoom = (data: { socketId: string, user: any }) => {
            if (data.user) {
                toast.info(t('virtualRoom.toast.left', { name: data.user.name, defaultValue: `${data.user.name} left the room` }));
            }
            setParticipants(prev => {
                const next = new Map(prev);
                next.delete(data.socketId);
                return next;
            });
        };
        socket.on('user-left-room', handleUserLeftRoom);

        // Listen for incoming chat messages
        const handleReceiveMessage = (data: { user: string, message: string, time: string, senderId?: string }) => {
            setMessages(prev => [...prev, { user: data.user, text: data.message, time: data.time, senderId: data.senderId }]);
        };

        // Listen for timer updates (Authoritative source from server)
        const handleTimerUpdate = (data: { timeLeft: number, isRunning: boolean }) => {
            setTimeLeft(data.timeLeft);
            setIsTimerRunning(data.isRunning);
        };

        // Listen for session ended (Show Modal)
        const handleSessionEnded = () => {
            setIsSessionEnded(true);
            setIsTimerRunning(false);
            if (document.fullscreenElement) document.exitFullscreen();
        };

        // Listen for session resumed (Hide Modal)
        const handleSessionResumed = () => {
            setIsSessionEnded(false);
            toast.success(t('virtualRoom.toast.extended', 'Session extended!'));
        };

        // Listen for room closed (Redirect)
        const handleRoomClosed = () => {
            navigate('/rooms');
            toast.info(t('virtualRoom.toast.ended', 'Session ended by host or timeout.'));
        };

        // Hooks for incoming messages and timer updates
        socket.on('receive-message', handleReceiveMessage);
        socket.on('timer-update', handleTimerUpdate);
        socket.on('session-ended', handleSessionEnded);
        socket.on('session-resumed', handleSessionResumed);
        socket.on('room-closed', handleRoomClosed);

        return () => {
            // Pass the specific handler references to socket.off() to only remove the listeners registered by this effect
            // Leave listeners in useWebRTC.ts and other components intact
            // Prevents "ghost" data and broken UI states on re-render
            socket.off('room-users-snapshot', handleRoomUsersSnapshot);
            socket.off('user-joined-room', handleUserJoinedRoom);
            socket.off('user-left-room', handleUserLeftRoom);
            socket.off('receive-message', handleReceiveMessage);
            socket.off('timer-update', handleTimerUpdate);
            socket.off('session-ended', handleSessionEnded);
            socket.off('session-resumed', handleSessionResumed);
            socket.off('room-closed', handleRoomClosed);

            // Emit leave room to server
            socket.emit('leave-room', id);
        };
        // rerun when join room, register socket listeners, etc. changes
    }, [socket, connected, id, room?._id, user?.id]);

    // Enforce admin control settings
    useEffect(() => {

        // Only enforce restrictions on non-host users and if room data exists
        if (!isHost && room) {
            // If camera is disabled by admin and currently on, turn it off
            if (!roomSettings.allowCamera && cameraOn) {
                setCameraOn(false); // Local state
                toggleVideo(false); // WebRTC/ media track
                toast.info(t('virtualRoom.toast.cameraDisabled', 'Camera disabled by host'));
            }
            // If audio is disabled by admin and currently on, turn it off
            if (!roomSettings.allowAudio && micOn) {
                setMicOn(false);
                toggleAudio(false);
                toast.info(t('virtualRoom.toast.micDisabled', 'Microphone disabled by host'));
            }
        }
    }, [roomSettings, isHost, cameraOn, micOn, room, toggleVideo, toggleAudio, toast]); // Re run if any of these changes

    // Socket listeners for room settings
    useEffect(() => {

        // Only run if socket is connected
        if (!socket) return;

        // Settings update
        socket.on('room-settings-updated', (newSettings: { allowCamera: boolean, allowAudio: boolean, allowWhiteboard: boolean }) => {
            setRoomSettings(newSettings);
            if (!isHost) {
                toast.info(t('virtualRoom.toast.settingsUpdated', 'Room settings updated by host'));
            }
        });

        // Listen for being kicked
        socket.on('you-were-kicked', () => {
            navigate('/rooms');
            toast.error(t('virtualRoom.toast.kicked', 'You were removed from the room by the host'));
        });

        // Join Request - always listen (server only sends this to host)
        socket.on('join-request', (data: { requesterName: string, requesterId: string, requesterSocketId: string }) => {
            setPendingRequests(prev => [...prev, data]);
            toast.info(t('virtualRoom.toast.wantsToJoin', { name: data.requesterName, defaultValue: `${data.requesterName} wants to join` }));
        });

        // Listen for host changes
        socket.on('host-changed', (data: { socketId: string, user: any }) => {
            console.log(`[HOST_EVENT] New host: ${data.socketId} (${data.user.name})`);
            setCurrentHostSocketId(data.socketId);
            setActiveHostInfo(data.user);

            // If WE became the host, show a toast
            if (data.socketId === socket.id) {
                toast.success(t('virtualRoom.youAreHost', 'You are now the room host'), 5000);
            }
        });

        return () => {
            socket.off('room-settings-updated');
            socket.off('join-request');
            socket.off('you-were-kicked');
            socket.off('host-changed');
        };
    }, [socket, toast, navigate, t]);

    // Handle toggle room setting (Host only)
    const toggleRoomSetting = (setting: 'allowCamera' | 'allowAudio' | 'allowWhiteboard') => {
        if (!socket || !id || !isHost) return;
        const newSettings = { ...roomSettings, [setting]: !roomSettings[setting] };
        setRoomSettings(newSettings);
        socket.emit('update-room-settings', { roomId: id, ...newSettings });
    };

    // Handle kick user (Host only)
    const handleKickUser = async (socketId: string, userName: string) => {
        if (!socket || !id || !isHost) return;

        const confirmed = await confirmAction({
            title: t('common.warning'),
            message: t('virtualRoom.alert.kickConfirm', { name: userName, defaultValue: `Kick ${userName} from the room?` }),
            variant: 'danger',
            confirmLabel: t('virtualRoom.hostControls.kick')
        });

        if (confirmed) {
            socket.emit('kick-user', { roomId: id, targetSocketId: socketId });
            toast.info(t('virtualRoom.toast.userRemoved', { name: userName, defaultValue: `${userName} has been removed` }));
        }
    };

    // Handle join request response (Host only)
    const handleApproveJoin = (req: any, approved: boolean) => {
        if (socket && room && user) {
            socket.emit('respond-to-join', {
                requesterSocketId: req.requesterSocketId,
                requesterId: req.requesterId,
                requesterName: req.requesterName,
                roomId: id,
                roomName: room.name,
                hostName: user.name,
                approved
            });
        }
        setPendingRequests(prev => prev.filter(r => r.requesterSocketId !== req.requesterSocketId));

        if (approved) {
            toast.success(t('virtualRoom.toast.requestApproved', 'Join request approved ✅'));
        } else {
            toast.error(t('virtualRoom.toast.requestDenied', 'Join request denied ❌'));
        }
    };

    // Handle extension
    const handleExtendSession = () => {
        if (socket && id) {
            socket.emit('extend-session', id);
        }
    };

    // Handle end session
    const handleEndSession = () => {
        if (socket && id) {
            socket.emit('end-session', id);
        }
    };

    // Leave room handler
    const handleLeave = async () => { // Confirmation before leaving
        const confirmed = await confirmAction({
            title: t('common.confirm'),
            message: t('virtualRoom.alert.leaveConfirm', 'Are you sure you want to leave the study session?'),
            variant: 'warning',
            confirmLabel: t('virtualRoom.leave')
        });

        if (confirmed) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            navigate('/rooms');
            toast.info(t('virtualRoom.toast.youLeft', 'You left the room'));
        }
    };

    // Update local state and enable/disable media tracks via useWebRTC
    const handleToggleMic = () => {
        const newState = !micOn;
        setMicOn(newState);
        toggleAudio(newState);
    };

    const handleToggleCamera = () => {
        const newState = !cameraOn;
        setCameraOn(newState);
        toggleVideo(newState);
    };

    // Toggle fullscreen on and off, affects UI and icon rendering
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Send message handler via socket.io
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        // Trim whitespace and prevent empty messages
        if (!chatMessage.trim()) return;

        const currentUserId = user?.id || user?._id;

        if (socket && id) {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Optimistic UI update
            setMessages(prev => [...prev, {
                user: user?.name || 'Guest',
                text: chatMessage,
                time,
                senderId: currentUserId
            }]);

            socket.emit('send-message', {
                roomId: id,
                message: chatMessage,
                user: user?.name || 'Guest',
                senderId: currentUserId
            });
        }
        setChatMessage('');
    };

    // Helper function to format seconds into mm:ss format
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Loading state
    if (!room) return <div className="bg-slate-50 dark:bg-gray-950 text-slate-500 dark:text-gray-400 min-h-screen flex items-center justify-center">{t('virtualRoom.loading')}</div>;


    return (
        // Render JSX 
        <div className="flex h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 overflow-hidden font-sans relative">

            {/* --- Pending join requests (Host view) ---*/}
            {pendingRequests.length > 0 && (
                <div className="absolute top-20 right-4 z-50 w-80 space-y-2">
                    {pendingRequests.map((req) => (
                        // Request card that contains the requester's name and avatar
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

                            {/* Approve/deny buttons */}
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

            {/* Left: Main Meet Area */}
            <div className="flex-1 flex flex-col relative transition-all duration-300">

                {/* Header Overlay */}
                <div className="relative md:absolute top-0 left-0 w-full p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center z-10 pointer-events-none">

                    {/* Container for room info */}
                    <div className="pointer-events-auto flex items-center gap-2 w-full md:w-auto overflow-hidden">
                        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/60 dark:border-gray-700/60 p-2.5 md:p-3 pr-4 md:pr-6 rounded-2xl shadow-sm flex items-center gap-3 md:gap-4 w-full md:w-auto min-w-0">
                            <div className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Video className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xs md:text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-0.5 truncate">
                                    <span className="truncate">{room.name}</span>
                                    {room.type === 'private' && <Lock className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-400 dark:text-gray-500 flex-shrink-0" />}
                                </h2>
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-slate-500 dark:text-gray-400 font-medium overflow-hidden whitespace-nowrap">
                                    <span>ID: {id?.slice(-6).toUpperCase()}</span>
                                    <span className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-slate-300 dark:bg-gray-600 flex-shrink-0"></span>
                                    <span className="truncate">{room.level}</span>
                                    {activeHostInfo && (
                                        <>
                                            <span className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-slate-300 dark:bg-gray-600 flex-shrink-0"></span>
                                            <span className="truncate text-indigo-600 dark:text-indigo-400 font-bold">
                                                {t('virtualRoom.host', 'Host')}: {activeHostInfo.name}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 pointer-events-auto no-scrollbar">
                        {/* Pomodoro Timer Display */}
                        <div className={`flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full px-3 md:px-5 py-1.5 flex items-center gap-2 md:gap-3 border shadow-sm transition-colors ${timeLeft <= 60 ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'border-slate-200 dark:border-gray-700'}`}>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <Clock className={`w-3.5 h-3.5 md:w-4 md:h-4 ${timeLeft <= 60 ? 'text-rose-500 dark:text-rose-400 animate-pulse' : 'text-indigo-500 dark:text-indigo-400'}`} />
                                <span className={`font-mono text-base md:text-xl font-bold tracking-widest ${timeLeft <= 60 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-gray-300'}`}>{formatTime(timeLeft)}</span>
                            </div>

                            {/* Statuses (Only show icon status on mobile, full text on desktop) */}
                            {timeLeft <= 300 && timeLeft > 60 && (
                                <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800 hidden lg:inline-block">5m {t('virtualRoom.timerStatus.left')}</span>
                            )}
                            {timeLeft <= 60 && (
                                <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-800 hidden lg:inline-block">{t('virtualRoom.timerStatus.endingSoon')}</span>
                            )}
                            {!isTimerRunning && !isSessionEnded && timeLeft > 0 && (
                                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-full hidden lg:inline-block">{t('virtualRoom.timerStatus.paused')}</span>
                            )}
                        </div>

                        {/* Button Group Control */}
                        <div className="flex items-center gap-2 ml-auto md:ml-0">
                            {/* Full Screen Toggle */}
                            <button
                                onClick={toggleFullScreen}
                                className="flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-2 md:p-2.5 rounded-full border border-slate-200 dark:border-gray-700 shadow-sm text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                title={isFullScreen ? t('virtualRoom.exitFullScreen') : t('virtualRoom.enterFullScreen')}
                            >
                                {isFullScreen ? <Minimize className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize className="w-4 h-4 md:w-5 md:h-5" />}
                            </button>

                            {/* Share Room Button (Host only) */}
                            {isHost && (
                                <button
                                    onClick={() => setShowSharePanel(true)}
                                    className="flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-2 md:p-2.5 rounded-full border border-slate-200 dark:border-gray-700 shadow-sm text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                    title={t('virtualRoom.shareRoom')}
                                >
                                    <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            )}

                            {/* Mobile Sidebar Toggle (Mobile only) */}
                            <button
                                onClick={() => document.getElementById('mobile-sidebar')?.classList.toggle('translate-x-full')}
                                className="md:hidden flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-2 md:p-2.5 rounded-full border border-slate-200 dark:border-gray-700 shadow-sm text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                title={t('virtualRoom.chatAndTools')}
                            >
                                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area: Video Grid OR Whiteboard */}
                <div className="flex-1 p-4 pt-4 md:pt-24 pb-32 overflow-hidden">
                    {activeView === 'grid' ? (
                        // Video Grid View
                        <div className="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8">
                            {/* Self */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-200 dark:border-gray-800 shadow-sm aspect-video group">
                                {streamReady && userStream && cameraOn ? (
                                    <VideoPlayer stream={userStream} muted={true} isMirrored={true} />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-2 md:mb-3 border border-indigo-100 dark:border-indigo-800 relative">
                                            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-800 animate-pulse"></div>
                                            <span className="text-lg md:text-xl font-bold text-indigo-600 dark:text-indigo-400">{t('virtualRoom.you')}</span>
                                        </div>
                                        <span className="text-xs md:text-sm text-slate-400 dark:text-gray-500 font-medium">{t('virtualRoom.cameraOff')}</span>
                                    </div>
                                )}
                                <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-slate-200 dark:border-gray-700 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold text-slate-700 dark:text-gray-300 shadow-sm flex items-center gap-2">
                                    <span>{t('virtualRoom.you')} {micOn ? '' : t('virtualRoom.muted')}</span>
                                    <div className={`w-2 h-2 rounded-full ${micOn ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`}></div>
                                </div>
                            </div>

                            {/* Remote Peers */}
                            {peers.map((peerNode) => {
                                const participant = participants.get(peerNode.peerId);
                                const displayName = participant?.name || `User ${peerNode.peerId.slice(0, 4)}`;

                                return (
                                    <div key={peerNode.peerId} className="bg-white dark:bg-gray-900 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-200 dark:border-gray-800 shadow-sm aspect-video">
                                        <div className="w-full h-full relative">
                                            {/* Stable Video Player using persisted stream */}
                                            <VideoPlayer stream={peerNode.stream || null} />
                                            {/* Status Overlay */}
                                            {peerNode.status !== 'connected' && (
                                                <div className="absolute inset-0 bg-slate-50/80 dark:bg-gray-800/80 flex flex-col items-center justify-center backdrop-blur-sm z-10 text-slate-400 dark:text-gray-500">
                                                    {peerNode.status === 'connecting' && (
                                                        <>
                                                            <div className="w-6 h-6 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-1 md:mb-2"></div>
                                                            <span className="text-[10px] md:text-xs font-bold">{t('virtualRoom.connecting')}</span>
                                                        </>
                                                    )}
                                                    {peerNode.status === 'failed' && (
                                                        <>
                                                            <div className="w-6 h-6 md:w-8 md:h-8 bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mb-1 md:mb-2">
                                                                <PhoneOff className="w-3 h-3 md:w-4 md:h-4" />
                                                            </div>
                                                            <span className="text-[10px] md:text-xs font-bold text-rose-500 dark:text-rose-400 text-center px-2">{t('virtualRoom.connectionFailed')}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-slate-200 dark:border-gray-700 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold text-slate-700 dark:text-gray-300 shadow-sm flex items-center gap-2 z-20">
                                            <span className="truncate max-w-[80px] md:max-w-none">{displayName}</span>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Empty Placeholders (adjust count based on peers) */}
                            {peers.length === 0 && (
                                <div className="bg-white dark:bg-gray-900 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-200 dark:border-gray-800 shadow-sm aspect-video">
                                    <div className="flex flex-col items-center opacity-50">
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center mb-2 md:mb-3">
                                            <Users className="w-5 h-5 md:w-6 md:h-6 text-slate-400 dark:text-gray-500" />
                                        </div>
                                        <span className="text-xs md:text-sm text-slate-400 dark:text-gray-500 font-medium text-center px-4">{t('virtualRoom.waitingForPeers')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Whiteboard View
                        <div className="h-full bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden relative">
                            {/* Pass read-only if permissions deny it AND user is not host */}
                            <Whiteboard
                                roomId={id}
                                isReadOnly={!roomSettings.allowWhiteboard && !isHost}
                            />

                            {/* Overlay if disabled */}
                            {!roomSettings.allowWhiteboard && !isHost && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold shadow-sm pointer-events-none z-10 flex items-center gap-2 w-max">
                                    <Lock className="w-3 h-3" />
                                    <span>{t('virtualRoom.whiteboardReadOnly')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Control Bar */}
                <div className="absolute bottom-4 md:bottom-6 left-0 right-0 p-4 md:p-0 flex flex-wrap items-center justify-center gap-2 md:gap-3 z-[90]">
                    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl md:rounded-full shadow-2xl border border-slate-200 dark:border-gray-800 p-2 flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-full">

                        {/* Mic Toggle */}
                        <button
                            onClick={handleToggleMic}
                            disabled={!roomSettings.allowAudio && !isHost}
                            className={`p-3 md:p-3.5 rounded-full transition-all duration-200 flex-shrink-0 ${micOn ? 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 ring-2 ring-rose-100 dark:ring-rose-900/30'} ${(!roomSettings.allowAudio && !isHost) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            title={(!roomSettings.allowAudio && !isHost) ? t('virtualRoom.micDisabled') : (micOn ? t('virtualRoom.muteMic') : t('virtualRoom.unmuteMic'))}
                        >
                            {micOn ? <Mic className="w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
                        </button>

                        {/* Camera Toggle */}
                        <button
                            onClick={handleToggleCamera}
                            disabled={!roomSettings.allowCamera && !isHost}
                            className={`p-3 md:p-3.5 rounded-full transition-all duration-200 flex-shrink-0 ${cameraOn ? 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 ring-2 ring-rose-100 dark:ring-rose-900/30'} ${(!roomSettings.allowCamera && !isHost) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            title={(!roomSettings.allowCamera && !isHost) ? t('virtualRoom.cameraDisabled') : (cameraOn ? t('virtualRoom.turnOffCamera') : t('virtualRoom.turnOnCamera'))}
                        >
                            {cameraOn ? <Video className="w-4 h-4 md:w-5 md:h-5" /> : <VideoOff className="w-4 h-4 md:w-5 md:h-5" />}
                        </button>

                        {/* Whiteboard Toggle */}
                        <button
                            onClick={() => setActiveView(activeView === 'grid' ? 'whiteboard' : 'grid')}
                            className={`p-3 md:p-3.5 rounded-full transition-all duration-200 flex-shrink-0 ${activeView === 'whiteboard'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950/50 hover:bg-indigo-700'
                                : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                            title={t('virtualRoom.toggleWhiteboard')}
                        >
                            <Pencil className="w-4 h-4 md:w-5 md:h-5" />
                        </button>

                        <div className="w-px h-6 md:h-8 bg-slate-200 dark:bg-gray-800 mx-0.5 md:mx-1"></div>

                        {/* Lofi Music Player */}
                        <div className="flex-shrink-0">
                            <MusicPlayer isMicOn={micOn} />
                        </div>

                        <div className="w-px h-6 md:h-8 bg-slate-200 dark:bg-gray-800 mx-0.5 md:mx-1"></div>

                        {/* Leave Call Button */}
                        <Button
                            variant="primary"
                            onClick={handleLeave}
                            className="bg-rose-600 hover:bg-rose-700 border-none px-4 md:px-6 rounded-full h-10 md:h-12 shadow-lg shadow-rose-200 dark:shadow-rose-950/30 flex-shrink-0"
                        >
                            <PhoneOff className="w-4 h-4 md:mr-2" />
                            <span className="font-semibold hidden md:inline">{t('virtualRoom.leave')}</span>
                        </Button>
                    </div>

                    {/* Settings — host sees room controls + participants, non-host sees participants only */}
                    <button
                        onClick={() => isHost ? setShowHostControls(true) : setShowParticipantsModal(true)}
                        className="bg-white dark:bg-gray-900 p-3 md:p-3.5 rounded-full shadow-xl border border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex-shrink-0"
                        title={t('virtualRoom.roomControls')}
                    >
                        <Settings className="w-4 h-4 md:w-5 md:h-5" />
                    </button>

                    <button
                        onClick={() => setShowHelpModal(true)}
                        className="bg-white dark:bg-gray-900 p-3 md:p-3.5 rounded-full shadow-xl border border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex-shrink-0"
                        title={t('virtualRoom.helpGuide')}
                    >
                        <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>
            </div>

            {/* Right: Sidebar (Chat/Resources) */}
            <div
                id="mobile-sidebar"
                className="w-full md:w-96 bg-white dark:bg-gray-900 border-l border-slate-200 dark:border-gray-800 flex flex-col shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)] z-[95] absolute md:relative right-0 top-0 bottom-0 transform translate-x-full md:translate-x-0 transition-transform duration-300"
            >
                {/* Mobile Header with Close Button */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <h3 className="font-bold text-slate-900 dark:text-white">{t('virtualRoom.chatAndTools') || 'Chat & Tools'}</h3>
                    <button
                        onClick={() => document.getElementById('mobile-sidebar')?.classList.add('translate-x-full')}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sidebar Tabs */}
                <div className="flex border-b border-slate-100 dark:border-gray-800 p-1 bg-slate-50/50 dark:bg-gray-800/50">
                    <button
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        <MessageSquare className="w-4 h-4 inline mr-2 -mt-0.5" /> {t('virtualRoom.tabs.chat')}
                    </button>
                    <button
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'resources' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab('resources')}
                    >
                        <BookOpen className="w-4 h-4 inline mr-2 -mt-0.5" /> {t('virtualRoom.tabs.resources')}
                    </button>
                    <button
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'todo' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab('todo')}
                    >
                        <ListTodo className="w-4 h-4 inline mr-2 -mt-0.5" /> {t('virtualRoom.tabs.todo')}
                    </button>
                                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {activeTab === 'chat' ? (
                        <div className="space-y-6">
                            {/* Date Separator */}
                            <div className="flex items-center gap-4">
                                <div className="h-px bg-slate-100 dark:bg-gray-800 flex-1"></div>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">{t('virtualRoom.chat.today')}</span>
                                <div className="h-px bg-slate-100 dark:bg-gray-800 flex-1"></div>
                            </div>

                            {messages.map((msg, i) => {
                                const isMe = msg.senderId ? msg.senderId === (user?.id || user?._id) : msg.user === 'You';
                                return (
                                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-end gap-2 mb-1">
                                            {!isMe && (
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-400 shadow-sm border border-white dark:border-gray-800">
                                                    {msg.user[0]}
                                                </div>
                                            )}
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-gray-500">{isMe ? t('virtualRoom.chat.me') : msg.user} • {msg.time}</span>
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${isMe
                                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                                            : 'bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-tl-sm'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    ) : activeTab === 'resources' ? (
                        // Resources Tab
                        <ResourcesPanel
                            roomId={id || ''}
                            level={room?.level || 'General'}
                            domain={room?.domainIds?.[0] || 'General'}
                        />
                    ) : (
                        // Todo Tab
                        <TodoPanel roomId={id || ''} />
                    )}
                </div>

                {/* Chat Input */}
                {
                    activeTab === 'chat' && (
                        <div className="p-4 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 mb-[env(safe-area-inset-bottom)]">
                            <form onSubmit={handleSendMessage} className="relative group">
                                <input
                                    type="text"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    inputMode="text"
                                    enterKeyHint="send"
                                    placeholder={t('virtualRoom.chat.typeMessage')}
                                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full pl-5 pr-12 py-3.5 text-sm text-slate-700 dark:text-gray-300 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 focus:border-indigo-300 dark:focus:border-indigo-700 outline-none transition-all shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatMessage.trim()}
                                    className={`absolute right-2 top-2 p-2 rounded-full transition-all ${chatMessage.trim()
                                        ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105 active:scale-95'
                                        : 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-600 cursor-not-allowed'
                                        }`}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    )
                }
            </div >

            {/* Session Ended Modal */}
            {
                isSessionEnded && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-white/20 dark:border-gray-800 relative overflow-hidden">

                            {/* Background decoration */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600"></div>

                            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            </div>

                            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{t('virtualRoom.sessionEnded.title')}</h2>
                            <p className="text-slate-500 dark:text-gray-400 mb-8">
                                {t('virtualRoom.sessionEnded.desc1')}
                                <br />{t('virtualRoom.sessionEnded.desc2')}
                            </p>

                            {isHost ? ( // Host can extend session for 25 minutes or end session
                                <div className="space-y-3">
                                    <Button
                                        onClick={handleExtendSession}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl text-lg shadow-lg shadow-indigo-200 dark:shadow-indigo-950/30"
                                    >
                                        {t('virtualRoom.sessionEnded.extend')}
                                    </Button>
                                    <Button
                                        onClick={handleEndSession}
                                        variant="outline"
                                        className="w-full border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 py-3 rounded-xl"
                                    >
                                        {t('virtualRoom.sessionEnded.endAll')}
                                    </Button>
                                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-4">{t('virtualRoom.sessionEnded.autoEndingWarn')}</p>
                                </div>
                            ) : ( // Guests see loading animation while waiting for host decision
                                <div className="bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl p-6">
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                    <p className="font-semibold text-slate-700 dark:text-gray-300">{t('virtualRoom.sessionEnded.waitingHost')}</p>
                                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">{t('virtualRoom.sessionEnded.roomAutoCloseWarn')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Host Controls Modal */}
            {isHost && (
                <HostControlsModal
                    isOpen={showHostControls}
                    onClose={() => setShowHostControls(false)}
                    participants={Array.from(participants.entries()).map(([socketId, p]) => ({
                        socketId,
                        info: p
                    }))}
                    currentUserId={user?.id || user?._id}
                    roomSettings={roomSettings}
                    onToggleSetting={toggleRoomSetting}
                    onKickUser={handleKickUser}
                />
            )}

            {/* Participants Modal (non-host view — same layout as host settings, no controls) */}
            {!isHost && showParticipantsModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800">

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">👥 {t('virtualRoom.participants.title', 'Participants')}</h2>
                            <button
                                onClick={() => setShowParticipantsModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Participants List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                                {t('virtualRoom.hostControls.participants', 'Participants')} ({participants.size + 1})
                            </h3>
                            <div className="space-y-2">
                                {/* Self */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                        {user?.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {user?.name}
                                            <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-2">{t('virtualRoom.hostControls.you', 'You')}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Other participants */}
                                {Array.from(participants.entries()).map(([socketId, p]) => (
                                    <div key={socketId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                            {p.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {p.name}
                                                {socketId === currentHostSocketId && (
                                                    <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-2">{t('virtualRoom.host', 'Host')}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-200 dark:border-gray-800">
                            <Button
                                variant="outline"
                                onClick={() => setShowParticipantsModal(false)}
                                className="w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                {t('virtualRoom.hostControls.close', 'Close')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('virtualRoom.guide.title')}</h2>
                                <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">{t('virtualRoom.guide.subtitle')}</p>
                            </div>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {/* Two-column grid for features */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                {/* Video and Audio */}
                                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                            <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{t('virtualRoom.guide.videoAudio')}</h3>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                                        <p>{t('virtualRoom.guide.videoAudioDesc')}</p>
                                        <p className="text-slate-500 dark:text-gray-500">{t('virtualRoom.guide.videoAudioTip')}</p>
                                    </div>
                                </div>

                                {/* Whiteboard */}
                                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                            <Pencil className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{t('virtualRoom.guide.whiteboard')}</h3>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                                        <p>{t('virtualRoom.guide.whiteboardDesc')}</p>
                                        <p className="text-slate-500 dark:text-gray-500">{t('virtualRoom.guide.whiteboardTip')}</p>
                                    </div>
                                </div>

                                {/* Chat and Resources */}
                                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{t('virtualRoom.guide.chatResources')}</h3>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                                        <p>{t('virtualRoom.guide.chatResourcesDesc')}</p>
                                        <p className="text-slate-500 dark:text-gray-500">{t('virtualRoom.guide.chatResourcesTip')}</p>
                                    </div>
                                </div>

                                {/* Timer */}
                                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{t('virtualRoom.guide.timer')}</h3>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                                        <p>{t('virtualRoom.guide.timerDesc')}</p>
                                        <p className="text-slate-500 dark:text-gray-500">{t('virtualRoom.guide.timerTip')}</p>
                                    </div>
                                </div>

                                {/* To-Do */}
                                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                                            <ListTodo className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{t('virtualRoom.guide.todo')}</h3>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                                        <p>{t('virtualRoom.guide.todoDesc')}</p>
                                        <p className="text-slate-500 dark:text-gray-500">{t('virtualRoom.guide.todoTip')}</p>
                                    </div>
                                </div>

                                {/* Music Player */}
                                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                            <Music className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                        </div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{t('virtualRoom.guide.music')}</h3>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                                        <p>{t('virtualRoom.guide.musicDesc')}</p>
                                        <p className="text-slate-500 dark:text-gray-500">{t('virtualRoom.guide.musicTip')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Host Controls - only shown if host */}
                            {isHost && (
                                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 mb-5">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                                            <Settings className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="font-medium text-slate-900 dark:text-white">{t('virtualRoom.guide.hostControlsTitle')}</h3>
                                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded-full">{t('virtualRoom.guide.hostBadge')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                                            <span>{t('virtualRoom.guide.hostDesc1')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                                            <span>{t('virtualRoom.guide.hostDesc2')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                                            <span>{t('virtualRoom.guide.hostDesc3')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                                            <span>{t('virtualRoom.guide.hostDesc4')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tips - simpler inline design */}
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-gray-900">
                                <span className="text-lg">💡</span>
                                <div className="text-sm text-amber-900 dark:text-amber-300">
                                    <span className="font-medium">{t('virtualRoom.guide.proTip')}</span> {t('virtualRoom.guide.proTipDesc')}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50">
                            <Button
                                variant="primary"
                                onClick={() => setShowHelpModal(false)}
                                className="w-full"
                            >
                                {t('virtualRoom.guide.gotIt')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Room Panel Modal */}
            {room && (
                <ShareRoomPanel
                    isOpen={showSharePanel}
                    onClose={() => setShowSharePanel(false)}
                    room={room}
                />
            )}
        </div >
    );
};
export default VirtualRoomPage;

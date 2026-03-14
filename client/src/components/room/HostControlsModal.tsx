import React from 'react';
import { X, Video, VideoOff, Mic, MicOff, Edit3, PenOff, UserX } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

// Participant interface defining structure of user data in the room
interface Participant {
    socketId: string;
    info: {
        name: string;
        _id?: string;
        id?: string;
    };
}

// Props for HostControlsModal component
interface HostControlsModalProps {
    isOpen: boolean; // Visibility state of the modal
    onClose: () => void; // Function to close the modal
    participants: Participant[]; // List of current participants in the room
    currentUserId?: string; // ID of the current user (host) to identify self
    roomSettings: { // Current room settings state
        allowCamera: boolean;
        allowAudio: boolean;
        allowWhiteboard: boolean;
    };
    onToggleSetting: (setting: 'allowCamera' | 'allowAudio' | 'allowWhiteboard') => void; // Handler to toggle specific settings
    onKickUser: (socketId: string, userName: string) => void; // Handler to kick a specific user
}

// Main component for host to manage room settings and participants
const HostControlsModal: React.FC<HostControlsModalProps> = ({
    isOpen,
    onClose,
    participants,
    currentUserId,
    roomSettings,
    onToggleSetting,
    onKickUser
}) => {
    const { t } = useTranslation();

    // If modal is not open, early return
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800">

                {/* Header Section */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">🛠️ {t('virtualRoom.hostControls.title')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Participants Management Section */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                            {t('virtualRoom.hostControls.participants')} ({participants.length})
                        </h3>
                        <div className="space-y-2">
                            {participants.map((participant) => {
                                // Check if the participant is the current user (host)
                                const isCurrentUser = participant.info._id === currentUserId || participant.info.id === currentUserId;
                                return (
                                    <div
                                        key={participant.socketId}
                                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* User Avatar */}
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                {participant.info.name[0].toUpperCase()}
                                            </div>

                                            {/* User Name */}
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {participant.info.name}
                                                    {isCurrentUser && <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-2">{t('virtualRoom.hostControls.you')}</span>}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Kick Button (Visible for other users only) */}
                                        {!isCurrentUser && (
                                            <button
                                                onClick={() => onKickUser(participant.socketId, participant.info.name)}
                                                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <UserX className="w-3.5 h-3.5" />
                                                {t('virtualRoom.hostControls.kick')}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Room Settings Configuration Section */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                            {t('virtualRoom.hostControls.roomSettings')}
                        </h3>
                        <div className="space-y-2">

                            {/* Camera Permission Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {roomSettings.allowCamera ? (
                                        <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    ) : (
                                        <VideoOff className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                    )}
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{t('virtualRoom.hostControls.camera')}</span>
                                </div>
                                <button
                                    onClick={() => onToggleSetting('allowCamera')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${roomSettings.allowCamera
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                        }`}
                                >
                                    {roomSettings.allowCamera ? t('virtualRoom.hostControls.enabled') : t('virtualRoom.hostControls.disabled')}
                                </button>
                            </div>

                            {/* Microphone Permission Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {roomSettings.allowAudio ? (
                                        <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    ) : (
                                        <MicOff className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                    )}
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{t('virtualRoom.hostControls.microphone')}</span>
                                </div>
                                <button
                                    onClick={() => onToggleSetting('allowAudio')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${roomSettings.allowAudio
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                        }`}
                                >
                                    {roomSettings.allowAudio ? t('virtualRoom.hostControls.enabled') : t('virtualRoom.hostControls.disabled')}
                                </button>
                            </div>

                            {/* Whiteboard Permission Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {roomSettings.allowWhiteboard ? (
                                        <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    ) : (
                                        <PenOff className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                    )}
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{t('virtualRoom.hostControls.whiteboard')}</span>
                                </div>
                                <button
                                    onClick={() => onToggleSetting('allowWhiteboard')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${roomSettings.allowWhiteboard
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                        }`}
                                >
                                    {roomSettings.allowWhiteboard ? t('virtualRoom.hostControls.enabled') : t('virtualRoom.hostControls.disabled')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="p-6 border-t border-slate-200 dark:border-gray-800">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        {t('virtualRoom.hostControls.close')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default HostControlsModal;
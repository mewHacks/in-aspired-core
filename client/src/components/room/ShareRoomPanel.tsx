import React, { useState } from 'react';
import { X, Link2, Copy, Check, Lock, Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { Room } from '../../types';
import { useTranslation } from 'react-i18next';

// Props for ShareRoomPanel component
interface ShareRoomPanelProps {
    isOpen: boolean;
    onClose: () => void;
    room: Room;
}

// Component for sharing room link and code
const ShareRoomPanel: React.FC<ShareRoomPanelProps> = ({ isOpen, onClose, room }) => {

    // Get toast context
    const toast = useToast();
    const { t } = useTranslation();

    // State for copied link and code
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    // Check if panel is open
    if (!isOpen) return null;

    // Check if room is private
    const isPrivate = room.type === 'private';

    // Get room ID
    const roomId = room._id;

    // Generate share URLs
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}/rooms/${roomId}`;
    const inviteLink = isPrivate && room.joinCode
        ? `${shareLink}?code=${room.joinCode}`
        : shareLink;

    // Copy link to clipboard
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopiedLink(true);
            toast.success(t('virtualRoom.share.linkCopied'));
            setTimeout(() => setCopiedLink(false), 2000);
        } catch { // Error copying to clipboard
            toast.error(t('virtualRoom.share.failedCopy'));
        }
    };

    // Copy code to clipboard (private rooms only)
    const handleCopyCode = async () => {

        // Check if room has a join code
        if (!room.joinCode) return;
        try {
            // Copy code to clipboard
            await navigator.clipboard.writeText(room.joinCode);
            setCopiedCode(true);
            toast.success(t('virtualRoom.share.codeCopied'));
            setTimeout(() => setCopiedCode(false), 2000);
        } catch { // Error copying to clipboard
            toast.error(t('virtualRoom.share.failedCopy'));
        }
    };

    return (
        // Render JSX
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        {isPrivate ? (
                            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        ) : (
                            <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {isPrivate ? t('virtualRoom.share.sharePrivate') : t('virtualRoom.share.sharePublic')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">

                    {/* Private Room: Show Join Code */}
                    {isPrivate && room.joinCode && (
                        <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide mb-2 block">
                                {t('virtualRoom.share.roomCode')}
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 dark:bg-gray-800 rounded-xl px-4 py-3 font-mono text-xl font-bold text-center tracking-[0.3em] text-slate-900 dark:text-white border-2 border-dashed border-slate-300 dark:border-gray-700">
                                    {room.joinCode}
                                </div>
                                <button
                                    onClick={handleCopyCode}
                                    className="p-3 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                    title={t('virtualRoom.share.copyCode')}
                                >
                                    {copiedCode ? (
                                        <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
                                {t('virtualRoom.share.shareCodeDesc')}
                            </p>
                        </div>
                    )}

                    {/* Share Link */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide mb-2 block">
                            {isPrivate ? t('virtualRoom.share.inviteLink') : t('virtualRoom.share.shareLink')}
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-slate-400 dark:text-gray-500 flex-shrink-0" />
                                    <span className="text-sm text-slate-600 dark:text-gray-400 truncate">
                                        {inviteLink}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleCopyLink}
                                className="p-3 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded-xl transition-colors"
                                title={t('virtualRoom.share.copyLinkTooltip')}
                            >
                                {copiedLink ? (
                                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <Copy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                )}
                            </button>
                        </div>
                        {isPrivate && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
                                {t('virtualRoom.share.linkIncludesCode')}
                            </p>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className={`p-4 rounded-xl ${isPrivate
                        ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                        <p className={`text-sm ${isPrivate
                            ? 'text-amber-800 dark:text-amber-400'
                            : 'text-emerald-800 dark:text-emerald-400'
                            }`}>
                            {isPrivate
                                ? t('virtualRoom.share.privateInfo')
                                : t('virtualRoom.share.publicInfo')}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-gray-800">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        {t('virtualRoom.share.done')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ShareRoomPanel;
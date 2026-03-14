import React, { useState, useEffect } from 'react';
import { BookOpen, Link as LinkIcon, FileText, Plus, Flag, ExternalLink, ShieldAlert, X, Loader2, Image as ImageIcon, Eye, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import GenericFileUpload from '../ui/GenericFileUpload';
import { useToast } from '../../contexts/ToastContext';
import { useSocket } from '../../contexts/SocketContext';
import { httpClient } from '../../services/httpClient';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

// TYPE DEFINITIONS
// A resource from the curated library (admin-managed, read-only, mock data types)
interface RecommendedResource {
    id: string;
    title: string;
    type: 'link' | 'pdf' | 'image';
    source: string; // Where the resource came from (e.g. "Khan Academy")
    url: string;
}

// A resource uploaded by a user during a room session
interface SessionResource {
    _id: string;         // MongoDB document ID
    title: string;
    type: 'link' | 'pdf' | 'image';
    url: string;
    uploaderId: {
        _id: string;
        name: string;    // show this under the resource title
        avatar?: string;
    };
    createdAt: string;   // ISO date string, we format it to show time only
}

// Props that the parent component passes to this panel
interface ResourcesPanelProps {
    roomId: string;  // Which room we're in (used to fetch the right resources)
    level: string;   // Education level (e.g. "Foundation", "Diploma") for filtering recommendations
    domain: string;  // Study domain (e.g. "Computing") for filtering recommendations
}

// HELPER: getResourceIcon
// Returns the right icon component based on the resource type
// PDF = red document icon, Image = purple image icon, Link = green link icon
const getResourceIcon = (type: string) => {
    switch (type) {
        case 'pdf':   return <FileText className="w-4 h-4 text-red-500 dark:text-red-400" />;
        case 'image': return <ImageIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
        case 'link':  return <LinkIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
        default:      return <LinkIcon className="w-4 h-4 text-slate-500 dark:text-gray-400" />;
    }
};


// MAIN COMPONENT
const ResourcesPanel: React.FC<ResourcesPanelProps> = ({ roomId, level, domain }) => {

    // Toast notifications (e.g. "Resource added successfully!")
    const { show } = useToast();

    // Socket connection for real-time updates (when someone else uploads a resource)
    const { socket } = useSocket();

    // Translation hook for multi-language support
    const { t } = useTranslation();
    const { confirm: confirmAction } = useConfirm();

    // STATE: Session Resources (user-uploaded)
    // The list of resources uploaded in this room session
    const [sessionResources, setSessionResources] = useState<SessionResource[]>([]);

    // True while we're waiting for the API to return resources
    const [loading, setLoading] = useState(false);

    // STATE: Add Resource Modal
    // Controls whether the "Add Resource" modal is open or closed
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Holds the form values for the new resource being added
    const [newResource, setNewResource] = useState({
        title: '',
        type: 'link',  // Default to link type
        url: '',        // Will hold URL string or base64 for file uploads
        description: ''
    });

    // True while the add resource form is being submitted to the API
    const [isSubmitting, setIsSubmitting] = useState(false);

    // STATE: Report Modal  
    // When a user clicks flag on a resource, we store that resource's
    // ID and title here so the report modal knows what to report
    // null means the modal is closed
    const [reportModal, setReportModal] = useState<{ resourceId: string; title: string } | null>(null);

    // The reason the user selected in the report modal
    // (e.g. "Spam or misleading", "Harmful or dangerous")
    const [reportReason, setReportReason] = useState('');

    // True while the report is being submitted to the API
    const [isReporting, setIsReporting] = useState(false);

    // STATE: Recommended Resources (curated library)
    // The list of admin-curated recommended resources
    const [recommended, setRecommended] = useState<RecommendedResource[]>([]);

    // FUNCTION: fetchResources
    // Loads all user-uploaded resources for this room from the API.
    // Called on mount and whenever the socket tells us someone added a new resource.
    const fetchResources = async () => {
        try {
            setLoading(true); // Show the loading spinner

            // Call the API: GET /api/resources/:roomId
            const res = await httpClient(`/api/resources/${roomId}`);

            if (res.ok) {
                const response = await res.json();
                // Check if response conforms to new paginated structure { data, meta }
                // The API returns { data: [...], meta: {...} } for paginated results
                // use response.data if it exists, otherwise fall back to the whole response (if array)
                setSessionResources(response.data || response);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false); // Hide the loading spinner whether it succeeded or failed
        }
    };

    // Fetch resources as soon as the component loads (or when roomId changes)
    useEffect(() => {
        fetchResources();
    }, [roomId]);

    // Fetch Recommended Resources
    // Loads the curated library resources filtered by level and domain.
    // Re-runs if level or domain changes.
    useEffect(() => {
        const fetchRecommended = async () => {
            try {
                // Build query string with the room's level and domain
                // Map component props to API query parameters
                // In a production app, domain might need to be mapped to an ID
                const query = new URLSearchParams({
                    level: level || 'General',   // Fall back to 'General' if not set
                    domain: domain || 'General'
                });

                // Call the Library API: GET /api/resources/recommended?level=...&domain=...
                const res = await httpClient(`/api/resources/recommended?${query}`);

                if (res.ok) {
                    const data = await res.json();
                    setRecommended(data);
                }
            } catch (err) {
                console.error("Failed to fetch recommended resources", err);
            }
        };

        fetchRecommended();
    }, [level, domain]);

    // Listen for real-time resource updates via Socket.IO
    // When another user in the same room uploads a resource,
    // the server broadcasts a "resource-added" event.
    // We listen for that and re-fetch so everyone sees it instantly.
    useEffect(() => {
        if (!socket) return; // Don't do anything if socket isn't connected yet

        // When we receive a "resource-added" event, refresh our list
        socket.on('resource-added', () => {
            fetchResources();
        });

        // Remove the listener when the component unmounts or socket changes
        // This prevents memory leaks and duplicate listeners
        return () => {
            socket.off('resource-added');
        };
    }, [socket, roomId]);

    // FUNCTION: handleAddResource
    // Called when the user submits the "Add Resource" form.
    // Sends the new resource to the backend and notifies other users.
    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent the browser from refreshing the page
        setIsSubmitting(true);

        // Basic validation - title and URL are required
        if (!newResource.title || !newResource.url) {
            show(t('virtualRoom.resources.fillTitleUrl'), 'error');
            setIsSubmitting(false);
            return;
        }

        // Simulating "Safe" upload check
        if (newResource.type !== 'link' && !newResource.url.startsWith('http')) {
            // In real app, we'd handle file upload here. For now, we assume user pastes a link to drive/dropbox
            // or using proper file upload service.
        }

        try {
            // POST the new resource to the backend
            const res = await httpClient(`/api/resources/${roomId}`, {
                method: 'POST',
                body: JSON.stringify(newResource)
            });

            if (res.ok) {
                // Success! Show a toast, close the modal, reset the form, and refresh the list
                show(t('virtualRoom.resources.addSuccess'), 'success');
                setIsAddModalOpen(false);
                setNewResource({ title: '', type: 'link', url: '', description: '' });
                fetchResources();

                // Broadcast to all other users in this room so they see the new resource too
                if (socket) {
                    socket.emit('resource-added', { roomId });
                }
            } else {
                // The backend returned an error (e.g. rate limit exceeded, banned word detected)
                const err = await res.json();
                // Display specific error message from backend (e.g. Rate Limit reached)
                show(err.message || t('virtualRoom.resources.addFail'), 'error');
            }
        } catch (err) {
            // Network error (e.g. no internet, server down)
            show(t('virtualRoom.resources.networkError'), 'error');
        } finally {
            setIsSubmitting(false); // Re-enable the submit button
        }
    };

    // FUNCTION: openReportModal 
    // Called when user clicks the flag button on a resource.
    // Opens the report modal and stores which resource is being reported.
    const openReportModal = async (resourceId: string, title: string) => {
        const confirmed = await confirmAction({
            title: t('common.warning'),
            message: t('virtualRoom.resources.reportConfirm'),
            variant: 'warning'
        });
        if (!confirmed) return;
        setReportModal({ resourceId, title }); // Store which resource to report
        setReportReason('');                    // Reset any previously selected reason
    };

    // FUNCTION: handleReport 
    // Called when user confirms their report in the modal.
    // Sends the report + reason to the backend.
    // The resource is removed from the UI immediately after reporting
    // (even if it's not hidden yet) so the user doesn't see it again.
    const handleReport = async () => {
        // Safety check - shouldn't happen, but just in case modal state is null
        if (!reportModal) return;

        setIsReporting(true); // Show loading state on the submit button

        try {
            // POST the report to the backend
            // We send the reason the user selected so admins can see why it was flagged
            const res = await httpClient(`/api/resources/report/${reportModal.resourceId}`, {
                method: 'POST',
                body: JSON.stringify({ reason: reportReason || 'Inappropriate content' })
            });

            if (res.ok) {
                // Success! Show a thank-you message
                show(t('virtualRoom.resources.reportSuccess'), 'success');

                // Remove the reported resource from the local list immediately
                // This way the user doesn't have to keep seeing something they just reported
                setSessionResources(prev => prev.filter(r => r._id !== reportModal.resourceId));

                // Close the report modal
                setReportModal(null);
            } else {
                // Backend returned an error (e.g. user already reported this resource)
                const err = await res.json();
                show(err.message || t('virtualRoom.resources.reportFail'), 'error');
            }
        } catch {
            show(t('virtualRoom.resources.reportFail'), 'error');
        } finally {
            setIsReporting(false); // Re-enable the submit button
        }
    };

    // RENDER
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-800/50">

            {/* Header Section */}
            <div className="p-4 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center shadow-sm z-10">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        {t('virtualRoom.tabs.resources')}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400">{t('virtualRoom.resources.subtitle')}</p>
                </div>
                {/* Button to open the Add Resource modal */}
                <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                    <Plus className="w-3 h-3 mr-1" /> {t('virtualRoom.resources.add')}
                </Button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                {/* SECTION 1: Recommended Resources (from curated library) */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                        <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                            {t('virtualRoom.resources.recommended')} ({level})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {recommended.map(item => (
                            <div key={item.id} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm group">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                        {getResourceIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white leading-tight mb-1 truncate">{item.title}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-gray-400">
                                            <span className="bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-gray-400">{item.source}</span>
                                            <span>• {t('virtualRoom.resources.readOnly')}</span>
                                        </div>
                                    </div>
                                    {/* External link button - opens resource in new tab */}
                                    <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-300 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divider between recommended and session uploads */}
                <div className="h-px bg-slate-200 dark:bg-gray-800" />

                {/* SECTION 2: Session Uploads (user-uploaded resources) */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                            {t('virtualRoom.resources.sessionUploads')}
                        </span>
                        {/* Shows how many resources have been uploaded */}
                        <span className="text-[10px] text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {sessionResources.length} {t('virtualRoom.resources.items')}
                        </span>
                    </div>

                    {/* Show a spinner while resources are loading */}
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400 dark:text-gray-500" />
                        </div>

                    ) : sessionResources.length === 0 ? (
                        // Empty state - shown when no resources have been uploaded yet
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-xl bg-slate-50/50 dark:bg-gray-800/50">
                            <p className="text-xs text-slate-500 dark:text-gray-400 mb-2">{t('virtualRoom.resources.noResources')}</p>
                            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)} className="text-xs h-7 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                {t('virtualRoom.resources.shareSomething')}
                            </Button>
                        </div>

                    ) : (
                        // Resource cards - one card per uploaded resource
                        <div className="space-y-3">
                            {sessionResources.map(res => (
                                <div key={res._id} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-3 hover:shadow-md transition-all group relative">
                                    <div className="flex items-start gap-3">

                                        {/* Resource type icon (PDF/Image/Link) */}
                                        <div className="p-2 bg-slate-50 dark:bg-gray-800 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-900 group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100 dark:group-hover:border-gray-800">
                                            {getResourceIcon(res.type)}
                                        </div>

                                        {/* Resource title, uploader name, upload time, type tag */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-slate-800 dark:text-white leading-tight mb-1 line-clamp-2 pr-6">
                                                {res.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-gray-400 mb-1">
                                                {/* Name of the person who uploaded this */}
                                                <span className="font-medium text-slate-700 dark:text-gray-300">
                                                    {res.uploaderId?.name || t('virtualRoom.resources.unknown')}
                                                </span>
                                                {/* Time it was uploaded (e.g. "02:45 PM") */}
                                                <span>• {new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {/* Small badge showing the type (LINK / PDF / IMAGE) */}
                                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 text-[9px] rounded uppercase font-bold tracking-wider">
                                                {res.type}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action buttons - only visible when hovering over the card */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg p-0.5 shadow-sm border border-slate-100 dark:border-gray-800">

                                        {res.type === 'link' ? (
                                            // For links: show an "Open in new tab" button
                                            <a href={res.url} target="_blank" rel="noreferrer"
                                                className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-indigo-900/30 rounded-md"
                                                title={t('virtualRoom.resources.openLink')}>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        ) : (
                                            // For PDFs and images: show Preview and Download buttons
                                            <>
                                                <a href={res.url} target="_blank" rel="noreferrer"
                                                    className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-indigo-900/30 rounded-md"
                                                    title={t('virtualRoom.resources.preview')}>
                                                    <Eye className="w-3.5 h-3.5" />
                                                </a>
                                                <a href={res.url} download={res.title}
                                                    className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md"
                                                    title={t('virtualRoom.resources.download')}>
                                                    <Download className="w-3.5 h-3.5" />
                                                </a>
                                            </>
                                        )}

                                        {/* Report button - clicking this opens the report modal */}
                                        {/* Pass the resource ID and title so the modal knows what's being reported */}
                                        <button
                                            onClick={() => openReportModal(res._id, res.title)}
                                            className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md"
                                            title={t('virtualRoom.resources.report')}>
                                            <Flag className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL 1: Add Resource Modal Overlay                                       */}
            {/* Shows when user clicks the "+ Add" button in the header       */}
            {isAddModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-800">

                        {/* Modal header with title and close button */}
                        <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white">{t('virtualRoom.resources.shareResource')}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal form */}
                        <form onSubmit={handleAddResource} className="p-5 space-y-4">

                            {/* Type selector: Link / PDF / Image */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'link',  label: t('virtualRoom.resources.link'),  icon: <LinkIcon className="w-4 h-4" /> },
                                    { id: 'pdf',   label: t('virtualRoom.resources.pdf'),   icon: <FileText className="w-4 h-4" /> },
                                    { id: 'image', label: t('virtualRoom.resources.image'), icon: <ImageIcon className="w-4 h-4" /> }
                                ].map(tItem => (
                                    <button
                                        key={tItem.id}
                                        type="button"
                                        // When type changes, also clear the URL field to avoid sending wrong data
                                        onClick={() => setNewResource({ ...newResource, type: tItem.id as any, url: '' })}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                                            newResource.type === tItem.id
                                                ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                                : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 text-slate-600 dark:text-gray-400'
                                        }`}
                                    >
                                        <div className="mb-1">{tItem.icon}</div>
                                        {tItem.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                {/* Title input field */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                                        {t('virtualRoom.resources.titleLabel')}
                                    </label>
                                    <Input
                                        placeholder={newResource.type === 'link' ? t('virtualRoom.resources.egArticle') : t('virtualRoom.resources.egNotes')}
                                        value={newResource.title}
                                        onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                                        onKeyDown={(e) => e.stopPropagation()} // Prevent virtual room keyboard shortcuts from firing
                                        inputMode="text"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* URL or file upload - changes based on selected type */}
                                {newResource.type === 'link' ? (
                                    // Text input for pasting a URL
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                                            {t('virtualRoom.resources.urlLabel')}
                                        </label>
                                        <Input
                                            placeholder={t('virtualRoom.resources.phUrl', 'https://...')}
                                            value={newResource.url}
                                            onChange={e => setNewResource({ ...newResource, url: e.target.value })}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            inputMode="url"
                                            required
                                            type="text"
                                        />
                                        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                                            {t('virtualRoom.resources.adultWarning')}
                                        </p>
                                    </div>
                                ) : newResource.type === 'pdf' ? (
                                    // File picker for PDF uploads (max 20MB)
                                    <GenericFileUpload
                                        type="pdf"
                                        label={t('virtualRoom.resources.uploadPdf')}
                                        acceptedFormats={['application/pdf']}
                                        maxSizeMB={20}
                                        value={newResource.url}
                                        onChange={(val, name) => setNewResource({ ...newResource, url: val, title: newResource.title || name || '' })}
                                    />
                                ) : (
                                    // File picker for image uploads (JPG/PNG, max 5MB)
                                    <GenericFileUpload
                                        type="image"
                                        label={t('virtualRoom.resources.uploadImage')}
                                        acceptedFormats={['image/jpeg', 'image/png']}
                                        maxSizeMB={5}
                                        value={newResource.url}
                                        onChange={(val, name) => setNewResource({ ...newResource, url: val, title: newResource.title || name || '' })}
                                    />
                                )}
                            </div>

                            {/* Submit button - disabled while submitting or if URL is empty */}
                            <div className="pt-2">
                                <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting || !newResource.url}>
                                    {isSubmitting ? t('virtualRoom.resources.sharing') : t('virtualRoom.resources.shareResource')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: Report Resource                                */}
            {/* Shows when user clicks the flag button on a resource      */}
            {/* User must select a reason before they can submit the report   */}
            {reportModal && (
                <div className="absolute inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-800">

                        {/* Modal header - red tinted to signal "warning/danger" action */}
                        <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-red-50/50 dark:bg-red-900/20">
                            <div className="flex items-center gap-2">
                                <Flag className="w-4 h-4 text-red-500 dark:text-red-400" />
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Report Resource</h3>
                            </div>
                            {/* Close button - also clears the report modal state */}
                            <button onClick={() => setReportModal(null)} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-5 space-y-4">

                            {/* Show the title of the resource being reported */}
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Reporting: <span className="font-semibold text-gray-800 dark:text-gray-200">"{reportModal.title}"</span>
                            </p>

                            {/* Reason selector - user must pick one to enable the submit button */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                                    Why are you reporting this?
                                </label>
                                <div className="space-y-2">
                                    {/* Each button represents a possible report reason */}
                                    {/* Clicking a reason selects it (highlighted in red) */}
                                    {[
                                        'Inappropriate content',
                                        'Spam or misleading',
                                        'Harmful or dangerous',
                                        'Copyright violation',
                                        'Other'
                                    ].map(reason => (
                                        <button
                                            key={reason}
                                            type="button"
                                            onClick={() => setReportReason(reason)} // Set this as the selected reason
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                                                reportReason === reason
                                                    // Selected state: highlighted red
                                                    ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    // Unselected state: neutral gray
                                                    : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 text-slate-600 dark:text-gray-400'
                                            }`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit button - disabled until a reason is selected and not currently submitting */}
                            <Button
                                onClick={handleReport}
                                disabled={isReporting || !reportReason}
                                className="w-full bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                            >
                                {isReporting ? 'Submitting...' : 'Submit Report'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ResourcesPanel;
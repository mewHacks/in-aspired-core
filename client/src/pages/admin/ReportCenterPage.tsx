import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, AlertCircle, CheckCircle2, Filter, Trash2,
  Search, Clock, User, ArrowLeft, RefreshCw, Video, X,
  Bug, FileText, Lightbulb, MessageCircle, Sparkles,
  Image as ImageIcon, Flag, BookOpen, EyeOff,
  ExternalLink, Link as LinkIcon
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { httpClient } from '@/services/httpClient';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

// TYPE DEFINITIONS
interface Feedback {
  _id: string;
  userName: string;
  userEmail: string;
  type: 'bug' | 'content' | 'feature' | 'general';
  message: string;
  status: 'pending' | 'resolved';
  relatedTo?: { type: string; id?: string; name?: string; };
  attachments?: string[];
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface FeedbackStats {
  total: number;
  pending: number;
  resolved: number;
  byType: { bug?: number; content?: number; feature?: number; general?: number; };
  avgResolutionTimeHours?: number;
}

// A resource that users have flagged as inappropriate
interface ReportedResource {
  _id: string;
  title: string;
  type: 'link' | 'pdf' | 'image';
  url: string;
  status: string;        // 'active' or 'hidden'
  uploaderId: { _id: string; name: string; email: string; avatar?: string; };
  roomId: { _id: string; name: string; };
  reports: {             // Each item = one user's report
    _id: string;
    userId: { _id: string; name: string; email: string; };
    reason: string;      // e.g. "Spam or misleading"
    createdAt: string;
  }[];
  createdAt: string;
}

interface ResourceReportStats {
  totalReported: number;
  hidden: number;
  active: number;      
}

// MAIN COMPONENT
const ReportCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();
  const { confirm: confirmAction } = useConfirm();

  // Which tab is currently showing - "Feedback" or "Resource Reports"
  const [activeTab, setActiveTab] = useState<'feedback' | 'resources'>('feedback');


  // ---- Feedback Tab State ----
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({ total: 0, pending: 0, resolved: 0, byType: {} });
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bug' | 'content' | 'feature' | 'general'>('all');
  const [selectedAttachments, setSelectedAttachments] = useState<{ files: string[]; feedbackId: string } | null>(null);


  // ---- Resource Reports Tab State ----
  const [reportedResources, setReportedResources] = useState<ReportedResource[]>([]);
  const [resourceStats, setResourceStats] = useState<ResourceReportStats>({ totalReported: 0, hidden: 0, active: 0 });
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');
  // Filter for resource status - helps organize the view
  const [resourceStatusFilter, setResourceStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');

  // FUNCTION: fetchFeedback
  // Loads all user feedback from the backend API.
  const fetchFeedback = async () => {
    try {
      setFeedbackLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', '100');
      const res = await httpClient(`/api/feedback/admin/all?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback || []);
        setFeedbackStats(data.stats || { total: 0, pending: 0, resolved: 0, byType: {} });
      }
    } catch (err) {
      toast.error(t('admin.report.toast.fetchFail', 'Failed to load feedback'));
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => { fetchFeedback(); }, [statusFilter, typeFilter]);

  // FUNCTION: fetchReportedResources
  // Loads all resources that have been reported by users.
  const fetchReportedResources = async () => {
    try {
      setResourceLoading(true);
      const res = await httpClient('/api/resources/admin/reported');
      if (res.ok) {
        const data = await res.json();
        setReportedResources(data.data || []);
        setResourceStats(data.stats || { totalReported: 0, hidden: 0, active: 0 });
      }
    } catch (err) {
      toast.error('Failed to load reported resources');
    } finally {
      setResourceLoading(false);
    }
  };

  // Load resource reports when the Resource Reports tab is active
  useEffect(() => { if (activeTab === 'resources') fetchReportedResources(); }, [activeTab]);

  // FUNCTION: handleResolve
  // Admin marks a feedback as done/acknowledged.
  const handleResolve = async (id: string) => {
    try {
      const res = await httpClient(`/api/feedback/admin/${id}/resolve`, { method: 'PATCH' });
      if (res.ok) { toast.success(t('admin.report.toast.resolveSuccess', 'Feedback resolved!')); fetchFeedback(); }
      else toast.error(t('admin.report.toast.resolveFail', 'Failed to resolve feedback'));
    } catch { toast.error(t('admin.report.toast.resolveFail', 'Failed to resolve feedback')); }
  };

  // FUNCTION: handleDeleteFeedback
  // Admin permanently deletes a feedback submission.
  const handleDeleteFeedback = async (id: string) => {
    const confirmed = await confirmAction({
      title: t('common.warning'),
      message: t('admin.report.toast.deleteConfirm', 'Delete this feedback? This cannot be undone.'),
      variant: 'danger', confirmLabel: t('common.confirm')
    });
    if (!confirmed) return;
    try {
      const res = await httpClient(`/api/feedback/admin/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('admin.report.toast.deleteSuccess', 'Feedback deleted!')); fetchFeedback(); }
      else toast.error(t('admin.report.toast.deleteFail', 'Failed to delete feedback'));
    } catch { toast.error(t('admin.report.toast.deleteFail', 'Failed to delete feedback')); }
  };

  // FUNCTION: handleDismissReport
  // Admin says the reported resource is FINE.
  // Clears all reports and makes the resource visible again.
  const handleDismissReport = async (resourceId: string) => {
    try {
      const res = await httpClient(`/api/resources/admin/${resourceId}/dismiss`, { method: 'PATCH' });
      if (res.ok) {
        toast.success('Reports dismissed. Resource is visible again.');
        fetchReportedResources();
      } else toast.error('Failed to dismiss reports');
    } catch { toast.error('Failed to dismiss reports'); }
  };

  // FUNCTION: handleDeleteResource
  // Admin confirms the resource is genuinely bad.
  // Permanently deletes it from the database.
  const handleDeleteResource = async (resourceId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Resource',
      message: 'Permanently delete this resource? This cannot be undone.',
      variant: 'danger', confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    try {
      const res = await httpClient(`/api/resources/admin/${resourceId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Resource deleted successfully.');
        fetchReportedResources();
      } else toast.error('Failed to delete resource');
    } catch { toast.error('Failed to delete resource'); }
  };

  // HELPER: formatTimestamp
  // Converts ISO date strings into human-readable labels.
  // e.g. "Just now", "5m ago", "3h ago", "Yesterday", "Jan 15"
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (seconds < 60) return t('admin.report.time.justNow', 'Just now');
    if (minutes < 60) return t('admin.report.time.mAgo', { count: minutes, defaultValue: `${minutes}m ago` });
    if (hours < 24) return t('admin.report.time.hAgo', { count: hours, defaultValue: `${hours}h ago` });
    const days = Math.floor(hours / 24);
    if (days === 1) return t('admin.report.time.yesterday', 'Yesterday');
    if (days < 7) return t('admin.report.time.dAgo', { count: days, defaultValue: `${days}d ago` });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':     return <Bug className="w-4 h-4" />;
      case 'content': return <FileText className="w-4 h-4" />;
      case 'feature': return <Lightbulb className="w-4 h-4" />;
      default:        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug':     return 'red';
      case 'content': return 'amber';
      case 'feature': return 'blue';
      default:        return 'gray';
    }
  };

  // HELPER: getStatusInfo
  // Returns a badge + short description for each resource status.
  //   hidden (Red)   — Auto-hidden, not visible in room
  //   active (Green) — Only 1 report, still visible to students
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'hidden':
        return {
          badge: (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
              <EyeOff className="w-3 h-3" /> Hidden
            </span>
          ),
          description: 'Auto-hidden — students cannot see this',
        };
      default: // 'active'
        return {
          badge: (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          ),
          description: 'Visible to students — needs 1 more report to hide',
        };
    }
  };

  // Filter feedback by search query
  const filteredFeedback = feedback.filter(fb => {
    const q = searchQuery.toLowerCase();
    return fb.message.toLowerCase().includes(q) || fb.userName.toLowerCase().includes(q) || fb.userEmail.toLowerCase().includes(q);
  });

  // Filter resource reports by search query AND status filter
  const filteredResources = reportedResources
    .filter(r => {
      // First apply status filter
      if (resourceStatusFilter !== 'all' && r.status !== resourceStatusFilter) {
        return false;
      }
      // Then apply search filter
      const q = resourceSearch.toLowerCase();
      return r.title.toLowerCase().includes(q) || 
             r.uploaderId?.name?.toLowerCase().includes(q) ||
             r.roomId?.name?.toLowerCase().includes(q);
    })
    // Sort by most recent first
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // RENDER
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      {/* Decorative background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-100/30 dark:bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-100/30 dark:bg-rose-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

          {/* ---- BACK BUTTON ---- */}
          <div className="mb-4">
            <button onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group hover:scale-[1.02] active:scale-95">
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('admin.report.header.back', 'Back')}</span>
            </button>
          </div>

          {/* ---- PAGE HEADER ---- */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full text-xs font-medium mb-3">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('admin.report.header.badge', 'Feedback Management')}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('admin.report.header.title', 'Report Center')}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl">{t('admin.report.header.subtitle', 'User feedback and issue tracking')}</p>
              </div>
              {/* Refresh button */}
              <button
                onClick={() => activeTab === 'feedback' ? fetchFeedback() : fetchReportedResources()}
                disabled={feedbackLoading || resourceLoading}
                className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all duration-300 flex items-center gap-2 group disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${(feedbackLoading || resourceLoading) ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                <span>{t('admin.report.header.refresh', 'Refresh')}</span>
              </button>
            </div>
          </div>

          {/* TAB SWITCHER                                                  */}
          <div className="flex gap-1 mb-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-xl p-1 w-fit shadow-md">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'feedback' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <MessageSquare className="w-4 h-4" />
              Feedback
              {feedbackStats.pending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{feedbackStats.pending}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'resources' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <Flag className="w-4 h-4" />
              Resource Reports
              {resourceStats.totalReported > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">{resourceStats.totalReported}</span>
              )}
            </button>
          </div>

          {/* TAB 1: FEEDBACK TAB                        */}
          {activeTab === 'feedback' && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin.report.stats.total', 'Total Feedback')}</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{feedbackStats.total}</p></div>
                    <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30"><MessageSquare className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin.report.stats.pending', 'Pending')}</p><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{feedbackStats.pending}</p></div>
                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30"><AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin.report.stats.resolved', 'Resolved')}</p><p className="text-2xl font-bold text-green-600 dark:text-green-400">{feedbackStats.resolved}</p></div>
                    <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-6 p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <input type="text" placeholder={t('admin.report.filters.search', 'Search feedback...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:border-red-300 dark:focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 transition-all outline-none text-gray-900 dark:text-gray-100" />
                  </div>
                  <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="pl-10 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:border-red-300 dark:focus:border-red-600 transition-all outline-none appearance-none cursor-pointer text-gray-900 dark:text-gray-100">
                      <option value="all">{t('admin.report.filters.statusAll', 'All Status')}</option>
                      <option value="pending">{t('admin.report.filters.statusPending', 'Pending')}</option>
                      <option value="resolved">{t('admin.report.filters.statusResolved', 'Resolved')}</option>
                    </select>
                  </div>
                  <div className="relative group">
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="pl-4 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:border-red-300 dark:focus:border-red-600 transition-all outline-none appearance-none cursor-pointer text-gray-900 dark:text-gray-100">
                      <option value="all">{t('admin.report.filters.typeAll', 'All Types')}</option>
                      <option value="bug">{t('admin.report.filters.typeBug', '🐛 Bugs')}</option>
                      <option value="content">{t('admin.report.filters.typeContent', '📝 Content Issues')}</option>
                      <option value="feature">{t('admin.report.filters.typeFeature', '💡 Features')}</option>
                      <option value="general">{t('admin.report.filters.typeGeneral', '💬 General')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Feedback list */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/90 dark:border-gray-800/90 shadow-xl overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500 dark:text-red-400" />
                    {`Recent Feedback (${filteredFeedback.length})`}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {feedbackLoading ? (
                    <div className="p-12 text-center">
                      <div className="inline-block p-4 rounded-full bg-red-50 dark:bg-red-900/30 mb-4"><RefreshCw className="w-8 h-8 text-red-500 dark:text-red-400 animate-spin" /></div>
                      <p className="text-gray-500 dark:text-gray-400">{t('admin.report.list.loading', 'Loading feedback...')}</p>
                    </div>
                  ) : filteredFeedback.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4"><MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" /></div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('admin.report.list.empty', 'No feedback found')}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('admin.report.list.emptyDesc', 'Try adjusting your filters')}</p>
                    </div>
                  ) : (
                    filteredFeedback.map((fb) => {
                      const color = getTypeColor(fb.type);
                      return (
                        <div key={fb._id} className="group relative p-6 transition-all duration-300 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-transparent dark:hover:from-red-900/20 dark:hover:to-transparent">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-rose-500 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-3">
                                <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors duration-300`}>
                                  <User className={`w-3.5 h-3.5 text-${color}-600 dark:text-${color}-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300`} />
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white text-sm">{fb.userName}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{fb.userEmail}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm leading-relaxed group-hover:text-gray-900 dark:group-hover:text-gray-100">{fb.message}</p>
                              {fb.attachments && fb.attachments.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-2">
                                  {fb.attachments.slice(0, 1).map((file, idx) => {
                                    const isVideo = file.match(/\.(mp4|webm|mov)$/i);
                                    const isImage = file.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                    return (
                                      <a key={idx} href={`${import.meta.env.VITE_API_URL}/${file}`} target="_blank" rel="noopener noreferrer" className="group/attach block" onClick={(e) => e.stopPropagation()}>
                                        {isImage && <div className="w-16 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover/attach:border-red-400 group-hover/attach:bg-red-50 transition-all"><ImageIcon className="w-6 h-6 text-gray-400 group-hover/attach:text-red-500" /></div>}
                                        {isVideo && <div className="w-16 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover/attach:border-red-400 group-hover/attach:bg-red-50 transition-all"><Video className="w-6 h-6 text-gray-400 group-hover/attach:text-red-500" /></div>}
                                      </a>
                                    );
                                  })}
                                  {fb.attachments.length > 1 && (
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedAttachments({ files: fb.attachments as string[], feedbackId: fb._id }); }}
                                      className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 hover:border-red-400 transition-all flex flex-col items-center justify-center group/btn">
                                      <span className="text-xs font-bold text-gray-600 group-hover/btn:text-red-500">+{fb.attachments.length - 1}</span>
                                      <span className="text-[10px] text-gray-500 group-hover/btn:text-red-400">more</span>
                                    </button>
                                  )}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-${color}-50 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400 border border-${color}-200 dark:border-${color}-800 group-hover:bg-red-50 dark:group-hover:bg-red-900/30 group-hover:text-red-700 dark:group-hover:text-red-400 group-hover:border-red-200 dark:group-hover:border-red-800 transition-all duration-300`}>
                                  {getTypeIcon(fb.type)}{fb.type.charAt(0).toUpperCase() + fb.type.slice(1)}
                                </span>
                                {fb.status === 'resolved' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"><CheckCircle2 className="w-3 h-3" />{t('admin.report.stats.resolved', 'Resolved')}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><AlertCircle className="w-3 h-3" />{t('admin.report.stats.pending', 'Pending')}</span>
                                )}
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Clock className="w-3 h-3" />{formatTimestamp(fb.createdAt)}</span>
                                {fb.relatedTo?.name && (
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full"><MessageSquare className="w-3 h-3" />{fb.relatedTo.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-row items-center gap-2 lg:flex-col lg:items-stretch lg:min-w-[100px]">
                              {fb.status === 'pending' ? (
                                <button onClick={(e) => { e.stopPropagation(); handleResolve(fb._id); }}
                                  className="flex-1 lg:flex-none px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 text-white text-sm font-medium hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" />{t('admin.report.actions.resolve', 'Resolve')}
                                </button>
                              ) : (
                                <div className="flex-1 lg:flex-none px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium border border-green-200 dark:border-green-800 flex items-center justify-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" />{t('admin.report.stats.resolved', 'Resolved')}
                                </div>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteFeedback(fb._id); }}
                                className="flex-1 lg:flex-none p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 dark:from-red-600 dark:to-rose-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: RESOURCE REPORTS TAB     */}
          {activeTab === 'resources' && (
            <>
              {/* ---- SIMPLE STATUS LEGEND ---- */}
              <div className="mb-6 p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 shadow-sm">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">📋 Quick Guide — What each status means:</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-start gap-2.5 flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                    <EyeOff className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700 dark:text-red-400">🔴 Hidden</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">Auto-hidden after 2+ reports. Students <strong>cannot</strong> see it. Needs your decision.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-green-700 dark:text-green-400">🟢 Active</p>
                      <p className="text-xs text-green-600/80 dark:text-green-400/70 mt-0.5">Only 1 report. Still <strong>visible</strong> to students. One more report will auto-hide it.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Reported</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{resourceStats.totalReported}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hidden (needs action)</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{resourceStats.hidden}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <EyeOff className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active (still visible)</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resourceStats.active}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Search + Filter bar */}
              <div className="mb-6 p-5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search input */}
                  <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search by title, uploader, or room..." 
                      value={resourceSearch} 
                      onChange={(e) => setResourceSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:border-red-300 dark:focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 transition-all outline-none text-gray-900 dark:text-gray-100" 
                    />
                  </div>
                  
                  {/* Status filter dropdown */}
                  <div className="relative group sm:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <select 
                      value={resourceStatusFilter} 
                      onChange={(e) => setResourceStatusFilter(e.target.value as any)}
                      className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:border-red-300 dark:focus:border-red-600 transition-all outline-none appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">All Status</option>
                      <option value="active">🟢 Active Only</option>
                      <option value="hidden">🔴 Hidden Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reported resources list */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/90 dark:border-gray-800/90 shadow-xl overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-500 dark:text-red-400" />
                    Reported Resources ({filteredResources.length})
                  </h3>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {resourceLoading ? (
                    <div className="p-12 text-center">
                      <div className="inline-block p-4 rounded-full bg-red-50 dark:bg-red-900/30 mb-4">
                        <RefreshCw className="w-8 h-8 text-red-500 dark:text-red-400 animate-spin" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">Loading reported resources...</p>
                    </div>
                  ) : filteredResources.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="inline-block p-4 rounded-full bg-green-50 dark:bg-green-900/30 mb-4">
                        <BookOpen className="w-8 h-8 text-green-500 dark:text-green-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No reported resources found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {resourceSearch || resourceStatusFilter !== 'all' 
                          ? 'Try adjusting your filters' 
                          : 'Everything looks clean! 🎉'}
                      </p>
                    </div>
                  ) : (
                    filteredResources.map((resource) => {
                      const statusInfo = getStatusInfo(resource.status);

                      return (
                        <div key={resource._id} className="group relative p-6 transition-all duration-300 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-transparent dark:hover:from-red-900/20 dark:hover:to-transparent">
                          {/* Red hover bar on the left - matches feedback tab */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-rose-500 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            {/* LEFT SIDE: All the resource information */}
                            <div className="flex-1 min-w-0">
                              
                              {/* ---- HEADER: User info + type icon + title ----
                                  Matches feedback tab's user section with hover effects */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors duration-300">
                                  {resource.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-400" />}
                                  {resource.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:text-red-600 dark:group-hover:text-red-400" />}
                                  {resource.type === 'link' && <LinkIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-red-600 dark:group-hover:text-red-400" />}
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white text-sm">{resource.uploaderId?.name || 'Unknown'}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{resource.uploaderId?.email || ''}</span>
                              </div>

                              {/* Resource title */}
                              <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-3">
                                {resource.title}
                              </h4>
                              
                              {/* Status badges row */}
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                {statusInfo.badge}
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                  <Flag className="w-3 h-3" />
                                  {resource.reports.length} Report{resource.reports.length !== 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Meta info row - room and timestamp */}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full uppercase font-bold text-[9px]">
                                  {resource.type}
                                </span>
                                {resource.roomId?.name && (
                                  <span className="flex items-center gap-1">
                                    📁 Room: <span className="font-medium text-gray-700 dark:text-gray-300">{resource.roomId.name}</span>
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTimestamp(resource.createdAt)}
                                </span>
                              </div>

                              {/* ---- RESOURCE PREVIEW ----
                                  Images: click to open in new tab (like feedback attachments)
                                  Links/PDFs: open in new tab */}
                              <div className="mb-4">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">📎 Resource preview:</p>
                                {resource.type === 'image' ? (
                                  <a 
                                    href={resource.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="group/attach inline-block"
                                  >
                                    <img
                                      src={resource.url}
                                      alt={resource.title}
                                      className="h-32 w-auto max-w-xs rounded-lg border-2 border-gray-200 dark:border-gray-700 object-cover hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 transition-all shadow-sm"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  </a>
                                ) : resource.type === 'link' ? (
                                  <a 
                                    href={resource.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-red-400 transition-colors max-w-full"
                                  >
                                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{resource.url}</span>
                                  </a>
                                ) : (
                                  <a 
                                    href={resource.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-400 transition-colors"
                                  >
                                    <FileText className="w-4 h-4" />
                                    View PDF
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>

                              {/* ---- REPORTS SECTION: Who reported and why ---- */}
                              <div className="mt-4">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                  <Flag className="w-3 h-3" />
                                  Report details:
                                </p>
                                <div className="space-y-2">
                                  {resource.reports.map((report, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {report.userId?.name || 'Unknown user'}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatTimestamp(report.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                                          <span className="text-red-600 dark:text-red-400 font-medium">"{report.reason}"</span>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* RIGHT SIDE: Action buttons */}
                            <div className="flex flex-row items-center gap-2 lg:flex-col lg:items-stretch lg:min-w-[130px]">
                              {/* Dismiss button - green, like Resolve button in feedback */}
                              <button 
                                onClick={() => handleDismissReport(resource._id)}
                                className="flex-1 lg:flex-none px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 text-white text-sm font-medium hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Dismiss
                              </button>
                              
                              {/* Delete button */}
                              <button 
                                onClick={() => handleDeleteResource(resource._id)}
                                className="flex-1 lg:flex-none p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 dark:from-red-600 dark:to-rose-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* MODAL: Feedback Attachments                    */}
          {selectedAttachments && (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedAttachments(null)}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white">{t('admin.report.modal.title', 'All Attachments')}</h3>
                  <button onClick={() => setSelectedAttachments(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedAttachments.files.map((file, idx) => {
                      const isVideo = file.match(/\.(mp4|webm|mov)$/i);
                      const isImage = file.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      return (
                        <a key={idx} href={`${import.meta.env.VITE_API_URL}/${file}`} target="_blank" rel="noopener noreferrer" className="group block">
                          {isImage && <div className="w-full aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-1 group-hover:border-red-400 group-hover:bg-red-50 transition-all"><ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-red-500" /><span className="text-xs text-gray-500">{t('admin.report.modal.image', 'Image')}</span></div>}
                          {isVideo && <div className="w-full aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-1 group-hover:border-red-400 group-hover:bg-red-50 transition-all"><Video className="w-8 h-8 text-gray-400 group-hover:text-red-500" /><span className="text-xs text-gray-500">{t('admin.report.modal.video', 'Video')}</span></div>}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCenterPage;
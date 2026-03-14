// Admin user monitoring page with activity tracking and status management
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Shield, AlertTriangle, Clock, Eye, X, Activity, BookOpen, Briefcase, ArrowLeft, LogIn, UserCog, Filter, RefreshCw, UserCheck, UserX, Sparkles, ArrowUpRight, Circle, Zap, TrendingUp } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { httpClient } from '@/services/httpClient';
import { useAuth } from '@/contexts/AuthContext';
import io, { Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';

// -------------------------
// Interfaces
// -------------------------
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive?: string;
  createdAt?: string;
}

interface ActivityLog {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  activity: string;
  type: string;
  ip?: string;
  meta?: Record<string, any>;
  createdAt: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newToday: number;
}

// -------------------------
// Component
// -------------------------
const UserMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();

  // -------------------------
  // State
  // -------------------------
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    newToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // WebSocket & Live Feed
  const [isConnected, setIsConnected] = useState(false);
  const [liveActivities, setLiveActivities] = useState<ActivityLog[]>([]);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // -------------------------
  // Format Timestamp Helper
  // -------------------------
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return t('admin.monitor.time.justNow', 'Just now');
    if (minutes < 60) return t('admin.monitor.time.mAgo', { count: minutes, defaultValue: `${minutes}m ago` });
    if (hours < 24) return t('admin.monitor.time.hAgo', { count: hours, defaultValue: `${hours}h ago` });
    return date.toLocaleDateString();
  };

  // -------------------------
  // WebSocket Connection
  // -------------------------
  useEffect(() => {
    if (!currentUser) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);

      if (currentUser.role === 'admin') {
        socket.emit('join-admin-room', {
          role: currentUser.role,
          name: currentUser.name
        });
      }

      // Request last 50 activities
      socket.emit('request-recent-activities', 50);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    });

    socket.on('activities:recent', (recentActivities: ActivityLog[]) => {
      setLiveActivities(recentActivities);
    });

    socket.on('activity:new', (activity: ActivityLog) => {
      setLiveActivities((prev) => [activity, ...prev].slice(0, 50));

      // If modal is open for this user, add to their activities
      if (
        selectedUser && // ensure selectedUser is not null
        ((typeof activity.userId === 'string' && activity.userId === selectedUser._id) || // userId is string
          (typeof activity.userId !== 'string' && activity.userId._id === selectedUser._id)) // userId is object
      ) {
        setActivities((prev) => [activity, ...prev]);
      }
    });

    socket.on('activity:admin', (activity: ActivityLog) => {
      console.log('Admin activity:', activity);
    });

    return () => {
      socket.close();
    };
  }, [currentUser, selectedUser]);

  // -------------------------
  // Fetch users and stats
  // -------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersRes, statsRes] = await Promise.all([
          httpClient('/api/admin/users'),
          httpClient('/api/admin/users/stats')
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();

          // Normalize users: ensure _id exists and status is lowercase
          const normalizedUsers: User[] = usersData.map((u: any) => ({
            ...u,
            _id: u._id || u.id,
            status: u.status?.toLowerCase() || 'active',
          }));

          setUsers(normalizedUsers);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // -------------------------
  // Open activity modal
  // -------------------------
  const openActivityModal = async (user: User) => {
    if (!user._id) {
      console.error('User ID missing, cannot perform action', user);
      return;
    }

    setSelectedUser(user);
    setActivityLoading(true);
    try {
      const res = await httpClient(`/api/admin/users/${user._id}/activity`);
      console.log('Activity response', res);

      if (!res.ok) {
        const errData = await res.json();
        console.error('Failed to fetch activities:', errData);
        setActivities([]);
        return;
      }

      const data = await res.json();

      // Normalize logs: userId can be string or object
      const logs: ActivityLog[] = (data.data || []).map((log: ActivityLog) => ({
        ...log,
        userId: typeof log.userId === 'string' ? log.userId : log.userId._id,
        type: log.type || 'General',
      }));

      // Filter only for this user
      const userLogs = logs.filter((log) => log.userId === user._id);
      setActivities(userLogs);

    } catch (err) {
      console.error('Error fetching activities:', err);
      setActivities([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const closeActivityModal = () => {
    setSelectedUser(null);
    setActivities([]);
    setSelectedCategory('All');
  };

  // -------------------------
  // Suspend/Unsuspend user
  // -------------------------
  const toggleSuspend = async (user: User) => {
    if (!user._id) {
      console.error('User ID missing, cannot perform action', user);
      return;
    }

    try {
      const action = user.status === 'suspended' ? 'unsuspend' : 'suspend';
      console.log(`Attempting to ${action} user:`, user);

      const res = await httpClient(`/api/admin/users/${user._id}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error('Failed to update status:', errData);
        return;
      }

      const data = await res.json();

      if (!data.user?.status) {
        console.error('No user.status returned from backend');
        return;
      }

      const newStatus = data.user.status.toLowerCase();

      // Update local users
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u))
      );

      // Update stats dynamically
      setStats((prev) => {
        let activeUsers = prev.activeUsers;
        let suspendedUsers = prev.suspendedUsers;

        if (action === 'suspend') {
          activeUsers = Math.max(0, prev.activeUsers - 1);
          suspendedUsers = prev.suspendedUsers + 1;
        } else {
          activeUsers = prev.activeUsers + 1;
          suspendedUsers = Math.max(0, prev.suspendedUsers - 1);
        }

        return { ...prev, activeUsers, suspendedUsers };
      });

      // Add admin action locally if modal open for same user
      if (selectedUser && selectedUser._id === user._id) {
        setActivities((prev) => [
          {
            _id: Date.now().toString(),
            userId: user._id,
            activity: `Account ${action === 'suspend' ? 'suspended' : 'unsuspended'} by Admin`,
            createdAt: new Date().toISOString(),
            type: t('admin.monitor.modal.catAdmin', 'Admin Action'),
          },
          ...prev,
        ]);
      }

    } catch (err) {
      console.error('Error toggling suspend:', err);
    }
  };

  // -------------------------
  // Filter users
  // -------------------------
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || user.status === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // -------------------------
  // Filter activities
  // -------------------------
  const filteredActivities = activities.filter((log) => {
    if (selectedCategory === 'All') return true;
    return log.type === selectedCategory;
  });

  // -------------------------
  // Activity type icons & colors
  // -------------------------
  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'Auth': return <LogIn className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'Course': return <BookOpen className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case 'Career': return <Briefcase className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      case 'User': return <UserCog className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'Room': return <Circle className="w-4 h-4 text-teal-500 dark:text-teal-400" />;
      case 'Payment': return <Zap className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case 'Profile': return <UserCog className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
      case 'Admin':
      case 'Admin Action': return <Shield className="w-4 h-4 text-red-500 dark:text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getActivityColor = (type?: string) => {
    switch (type) {
      case 'Auth': return 'blue';
      case 'Course': return 'green';
      case 'Career': return 'purple';
      case 'User': return 'amber';
      case 'Room': return 'teal';
      case 'Payment': return 'rose';
      case 'Profile': return 'indigo';
      case 'Admin':
      case 'Admin Action': return 'red';
      default: return 'gray';
    }
  };

  // -------------------------
  // Loading/Error UI
  // -------------------------
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navbar />
      <div className="pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 rounded-full bg-violet-50 dark:bg-violet-900/30 animate-pulse">
            <Users className="w-12 h-12 text-violet-500 dark:text-violet-400" />
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading users...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navbar />
      <div className="pt-28 flex items-center justify-center">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-red-100 dark:border-red-900 shadow-xl">
          <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      </div>
    </div>
  );

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-100/30 dark:bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100/30 dark:bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Main content container */}
        <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">

          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group hover:scale-[1.02] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('admin.monitor.header.back', 'Back')}</span>
            </button>
          </div>

          {/* Hero Header */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-3 py-1.5 rounded-full text-xs font-medium mb-3">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-red-500 dark:bg-red-400'}`} />
                  {isConnected ? t('admin.monitor.status.live', 'Live Monitoring') : t('admin.monitor.status.reconnecting', 'Reconnecting...')}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('admin.monitor.header.title', 'User Monitoring')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500 dark:text-green-400 animate-pulse" />
                  {t('admin.monitor.header.subtitle', 'Real-time user activity & management')}
                </p>
              </div>

              {/* Quick Stats Cards */}
              <div className="flex gap-3">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-0.5">{stats.activeUsers}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.monitor.stats.active', 'Active')}</p>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-0.5">{stats.suspendedUsers}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.monitor.stats.suspended', 'Suspended')}</p>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-0.5">{stats.newToday}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.monitor.stats.newToday', 'New Today')}</p>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mb-0.5">{stats.totalUsers}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.monitor.stats.total', 'Total')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID: Live Feed + Users Table */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">

            {/* LEFT: Users Table */}
            <div className="xl:col-span-8">

              {/* Filters Section */}
              <div className="mb-6 p-5 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm 
                            border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-100/50 dark:shadow-gray-900/50">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 
                                     group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors" />
                    <input
                      type="text"
                      placeholder={t('admin.monitor.filters.search', 'Search users by name or email...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 
                               focus:bg-white dark:focus:bg-gray-800 focus:border-violet-300 dark:focus:border-violet-600 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 
                               transition-all duration-300 outline-none text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 
                                     group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-10 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 
                               focus:bg-white dark:focus:bg-gray-800 focus:border-violet-300 dark:focus:border-violet-600 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 
                               transition-all duration-300 outline-none appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                    >
                      <option value="All" className="bg-white dark:bg-gray-800">{t('admin.monitor.filters.statusAll', 'All Status')}</option>
                      <option value="Active" className="bg-white dark:bg-gray-800">{t('admin.monitor.filters.statusActive', 'Active')}</option>
                      <option value="Suspended" className="bg-white dark:bg-gray-800">{t('admin.monitor.filters.statusSuspended', 'Suspended')}</option>
                    </select>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 
                             hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/20
                             transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="hidden sm:inline">{t('admin.monitor.filters.refresh', 'Refresh')}</span>
                  </button>
                </div>
              </div>

              {/* Users Stats Bar */}
              <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-md">
                      <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.monitor.filters.showing', 'Showing')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {t('admin.monitor.filters.ofUsers', { filtered: filteredUsers.length, total: users.length, defaultValue: `${filteredUsers.length} of ${users.length} users` })}
                      </p>
                    </div>
                  </div>
                  {searchQuery && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Filter className="h-3.5 w-3.5" />
                      {t('admin.monitor.filters.filteredBy', 'Filtered by:')} "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>

              {/* Users Table Card */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/90 dark:border-gray-800/90 
                            shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 overflow-hidden">

                {/* Table Header - Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 
                                  border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <div className="col-span-3">{t('admin.monitor.table.user', 'User')}</div>
                  <div className="col-span-3">{t('admin.monitor.table.email', 'Email')}</div>
                  <div className="col-span-1">{t('admin.monitor.table.role', 'Role')}</div>
                  <div className="col-span-2">{t('admin.monitor.table.status', 'Status')}</div>
                  <div className="col-span-2">{t('admin.monitor.table.lastActive', 'Last Active')}</div>
                  <div className="col-span-1">{t('admin.monitor.table.actions', 'Actions')}</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[800px] overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                        <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('admin.monitor.table.noUsers', 'No users found')}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('admin.monitor.table.noUsersDesc', 'Try adjusting your search or filters')}</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="group relative p-3 md:p-4 hover:bg-gradient-to-r hover:from-violet-50/30 hover:to-transparent dark:hover:from-violet-900/20 dark:hover:to-transparent 
                                transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredRow(user._id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => openActivityModal(user)}
                      >
                        {/* Desktop Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-2 items-center text-sm">
                          <div className="col-span-3 flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg transition-all duration-300 ${hoveredRow === user._id ? 'scale-110' : ''
                              } ${user.status === 'active'
                                ? 'bg-green-50 dark:bg-green-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50'
                                : 'bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50'
                              }`}>
                              {user.status === 'active'
                                ? <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                : <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                              }
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]" title={user.name}>
                              {user.name}
                            </span>
                          </div>

                          <div className="col-span-3">
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate block max-w-[150px]" title={user.email}>
                              {user.email}
                            </span>
                          </div>

                          <div className="col-span-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium 
                                        bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                              {user.role}
                            </span>
                          </div>

                          <div className="col-span-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium min-w-[70px] text-center ${user.status === 'active'
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                              }`}>
                              {user.status === 'active' ? t('admin.monitor.filters.statusActive', 'Active') : t('admin.monitor.filters.statusSuspended', 'Suspended')}
                            </span>
                          </div>

                          <div className="col-span-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400 block font-mono" title={user.lastActive}>
                              {user.lastActive
                                ? new Date(user.lastActive).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                                : '—'
                              }
                            </span>
                          </div>

                          <div className="col-span-1 flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openActivityModal(user);
                              }}
                              className="p-1.5 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 
                                      border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:from-violet-500 
                                      hover:to-purple-500 hover:text-white hover:border-transparent
                                      transition-all duration-200 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-900/30"
                              title={t('admin.monitor.table.viewActivity', 'View activity')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSuspend(user);
                              }}
                              className={`p-1.5 rounded-lg transition-all duration-200 ${user.status === 'suspended'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 text-white hover:shadow-lg hover:shadow-green-300 dark:hover:shadow-green-900/30'
                                : 'bg-gradient-to-r from-red-500 to-rose-500 dark:from-red-600 dark:to-rose-600 text-white hover:shadow-lg hover:shadow-red-300 dark:hover:shadow-red-900/30'
                                }`}
                              title={user.status === 'suspended' ? t('admin.monitor.table.unsuspendUser', 'Unsuspend user') : t('admin.monitor.table.suspendUser', 'Suspend user')}
                            >
                              {user.status === 'suspended'
                                ? <UserCheck className="w-3.5 h-3.5" />
                                : <UserX className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </div>

                        {/* Hover indicator */}
                        {hoveredRow === user._id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:block">
                            <ArrowUpRight className="w-4 h-4 text-violet-500 dark:text-violet-400 animate-bounce-slow" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Live Activity Feed */}
            <div className="xl:col-span-4">
              <div className="sticky top-24">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/90 dark:border-gray-800/90 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 overflow-hidden">

                  {/* Header */}
                  <div className="p-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/20 dark:to-transparent border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 border border-violet-200 dark:border-violet-800">
                          <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{t('admin.monitor.header.feedTitle', 'Live Activity Feed')}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.monitor.header.feedSubtitle', 'Platform-wide updates')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLiveFeed(!showLiveFeed)}
                        className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
                      >
                        {showLiveFeed ? t('admin.monitor.header.hide', 'Hide') : t('admin.monitor.header.show', 'Show')}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-red-500 dark:bg-red-400'}`} />
                      {isConnected ? t('admin.monitor.header.activities', { count: liveActivities.length, defaultValue: `${liveActivities.length} activities` }) : t('admin.monitor.status.reconnecting', 'Reconnecting...')}
                    </div>
                  </div>

                  {/* Activity Stream */}
                  {showLiveFeed && (
                    <div className="max-h-[700px] overflow-y-auto p-4 space-y-3">
                      {liveActivities.length === 0 ? (
                        <div className="text-center py-12">
                          <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.monitor.feed.noActivity', 'No recent activity')}</p>
                        </div>
                      ) : (
                        liveActivities.map((activity, index) => {
                          const userName = typeof activity.userId === 'string'
                            ? t('admin.monitor.feed.unknownUser', 'Unknown User')
                            : activity.userId.name;
                          const color = getActivityColor(activity.type);

                          return (
                            <div
                              key={activity._id || index}
                              className={`p-3 rounded-xl bg-${color}-50/50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800/50 
                                       hover:shadow-md dark:hover:shadow-${color}-900/20 transition-all duration-300`}
                              style={{
                                animation: index === 0 ? 'slideIn 0.3s ease-out' : 'none'
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 border border-${color}-200 dark:border-${color}-800`}>
                                  {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                    {userName}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    {activity.activity}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400`}>
                                      {activity.type}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      {formatTimestamp(activity.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeActivityModal}
        >
          <div
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl w-full max-w-2xl 
                     max-h-[85vh] overflow-hidden shadow-2xl border border-white/90 dark:border-gray-800/90"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="relative p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/20 dark:to-transparent">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 border border-violet-200 dark:border-violet-800">
                    <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.monitor.modal.title', 'Activity Log')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {selectedUser.name} · {selectedUser.email}
                    </p>
                  </div>
                </div>
                <button onClick={closeActivityModal} className="p-2 rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors group">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                </button>
              </div>
            </div>

            {/* Filter Categories */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'All', label: t('admin.monitor.modal.catAll', 'All') },
                  { id: 'Auth', label: t('admin.monitor.modal.catAuth', 'Auth') },
                  { id: 'Course', label: t('admin.monitor.modal.catCourse', 'Course') },
                  { id: 'Career', label: t('admin.monitor.modal.catCareer', 'Career') },
                  { id: 'Room', label: t('admin.monitor.modal.catRoom', 'Room') },
                  { id: 'User', label: t('admin.monitor.modal.catUser', 'User') },
                  { id: 'Profile', label: t('admin.monitor.modal.catProfile', 'Profile') },
                  { id: 'Admin Action', label: t('admin.monitor.modal.catAdmin', 'Admin Action') }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300
                             border flex items-center gap-2 ${cat.id === selectedCategory
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow-lg shadow-violet-200 dark:shadow-violet-900/30'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400'
                      }`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {getActivityIcon(cat.id)}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity List */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {activityLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-violet-500 dark:border-t-violet-400 rounded-full animate-spin" />
                  <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">{t('admin.monitor.modal.loading', 'Loading...')}</p>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('admin.monitor.modal.noActivity', 'No activity found')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActivities.map((log, index) => (
                    <div key={index} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-700 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">{getActivityIcon(log.type)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{log.activity}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{log.type}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                {t('admin.monitor.modal.activities', { count: filteredActivities.length, defaultValue: `${filteredActivities.length} activities` })}
              </span>
              <button onClick={closeActivityModal} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700 rounded-lg">
                {t('admin.monitor.modal.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default UserMonitoringPage;
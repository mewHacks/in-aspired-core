import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import Navbar from '../components/layout/Navbar';
import RoomCard from '../components/rooms/RoomCard';
import RoomFilterSidebar, { RoomFilterState } from '../components/rooms/RoomFilterSidebar';
import { Button } from '../components/ui/Button';
import { SearchBar } from '../components/ui/SearchBar';
import ScrollRevelation from '../components/ui/ScrollRevelation';
import { Plus, Users, Loader2, Video, Filter as FilterIcon, Sparkles, Flame } from 'lucide-react';
import { Room } from '../types';
import { httpClient } from '../services/httpClient';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Define eligibility interface
interface Eligibility {
    eligible: boolean;
    count: number;
    threshold: number;
}

// Main virtual room listing page component
const VirtualRoomListingPage: React.FC = () => {
    const { t } = useTranslation();

    // Navigation hook
    const navigate = useNavigate();

    // Socket state
    const { socket } = useSocket();

    // Room and loading state
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    // Eligibility state
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Sidebar state
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Filters state
    const [filters, setFilters] = useState<RoomFilterState>({
        levels: [],
        domains: [],
        types: []
    });

    // Fetch initial data (rooms + user eligibility)
    const fetchData = React.useCallback(async () => {
        try {
            // Fetch rooms
            const roomsRes = await httpClient('/api/rooms');
            if (roomsRes.ok) {
                const data = await roomsRes.json();
                setRooms(data);
            }

            // Fetch eligibility
            const eligRes = await httpClient('/api/rooms/eligibility');
            if (eligRes.ok) {
                const data = await eligRes.json();
                setEligibility(data);
            }

        } catch (error) { // Error handling
            console.error('Failed to fetch rooms/eligibility', error);
        } finally { // Always stops loading indicator (even if API fails)
            setLoading(false);
        }
    }, []);

    // Effects
    useEffect(() => {
        fetchData(); // Run fetchData on mount

        // Listen for real-time room list updates
        if (socket) {
            socket.on('room-list-updated', fetchData);
        }

        return () => {
            if (socket) {
                socket.off('room-list-updated', fetchData);
            }
        };
    }, [socket, fetchData]);

    // Filters rooms based on search term and sidebar filters
    // useMemo ensures filtering only recalculates when inputs change, avoiding unnecessary re-renders
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {

            // Search term matching
            const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                room.description.toLowerCase().includes(searchTerm.toLowerCase());

            // Filter matching
            const matchesLevel = filters.levels.length === 0 || filters.levels.includes(room.level);
            const matchesType = filters.types.length === 0 || filters.types.includes(room.type);
            const matchesDomain = filters.domains.length === 0 ||
                (room.domainIds && room.domainIds.some(id => filters.domains.includes(id)));

            // Return result of all filters stacked correctly
            return matchesSearch && matchesLevel && matchesType && matchesDomain;
        });
    }, [rooms, searchTerm, filters]);

    // Sort rooms into categories (Recommended, Popular, Others)
    // Uses server-provided matchScore from RIASEC personality matching
    const sections = useMemo(() => {
        const recommended: Room[] = [];
        const popular: Room[] = []; // Using capacity fullness as proxy for popularity currently
        const others: Room[] = [];

        filteredRooms.forEach(room => {
            if (room.isRecommended && (room.matchScore || 0) > 0) { // Recommend: Server says this room matches user personality
                recommended.push(room);
            } else if ((room.memberCount || 0) > 5) { // Popular: Proxy: Member count more than 5
                popular.push(room);
            } else { // Others: All other rooms
                others.push(room);
            }
        });

        // Sort recommended by matchScore (highest first)
        recommended.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        // Sort 'others': Available first, Full last
        others.sort((a, b) => {
            const aFull = (a.memberCount || 0) >= a.maxParticipants;
            const bFull = (b.memberCount || 0) >= b.maxParticipants;
            if (aFull === bFull) return 0;
            return aFull ? 1 : -1;
        });

        return { recommended, popular, others };
    }, [filteredRooms]);

    const hasResults = filteredRooms.length > 0;

    // Render JSX
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pt-16">

            {/* Navigation bar */}
            <Navbar />

            {/* Header Section */}
            <section className="pt-12 pb-12 px-4 bg-white dark:bg-gray-900 relative border-b border-slate-100 dark:border-gray-800">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <ScrollRevelation>
                        {/* Icon badge */}
                        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-6">
                            <Video className="w-8 h-8" />
                        </div>

                        {/* Title & Description */}
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                            {t('rooms.listing.title')}
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                            {t('rooms.listing.subtitle')}
                        </p>

                        {/* Search & Actions Bar */}
                        <div className="relative max-w-2xl mx-auto flex flex-col gap-4">
                            <div className="flex gap-4">
                                <div className="flex-grow">
                                    <SearchBar
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder={t('rooms.listing.searchPlaceholder')}
                                    />
                                </div>

                                {/* Create Room Button */}
                                <div className="relative group flex-shrink-0">
                                    <Button
                                        variant="primary"
                                        disabled={!eligibility?.eligible} // Always visible but disabled if user is not eligible
                                        onClick={() => navigate('/rooms/create')}
                                        className="h-full flex items-center gap-2"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="hidden sm:inline">{t('rooms.listing.createBtn')}</span>
                                    </Button>

                                    {/* Tooltip to encourage engagement */}
                                    {!eligibility?.eligible && eligibility && (
                                        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none text-left border border-gray-700 dark:border-gray-700">
                                            <p className="mb-1 font-semibold">{t('rooms.listing.lockedTitle')}</p>
                                            <p dangerouslySetInnerHTML={{ __html: t('rooms.listing.lockedReason', { threshold: eligibility.threshold, count: eligibility.count }) }}></p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile filter toggle */}
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden flex items-center justify-center px-4 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-slate-700 dark:text-gray-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-700 shadow-sm transition-all"
                            >
                                <FilterIcon className="w-4 h-4 mr-2" />
                                {t('rooms.listing.filterBtn')}
                            </button>
                        </div>
                    </ScrollRevelation>
                </div>
            </section>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex gap-8">

                    {/* Sidebar */}
                    <div className="hidden lg:block w-72 flex-shrink-0">
                        <RoomFilterSidebar
                            filters={filters}
                            setFilters={setFilters}
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            onReset={fetchData}
                        />
                    </div>

                    {/* Mobile Drawer */}
                    <div className="lg:hidden">
                        <RoomFilterSidebar
                            filters={filters}
                            setFilters={setFilters}
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            onReset={fetchData}
                        />
                    </div>

                    {/* Results Grid */}
                    <div className="flex-1 space-y-12">
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            </div>
                        ) : hasResults ? (
                            <>
                                {/* Group 1: Recommended */}
                                {sections.recommended.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('rooms.listing.sections.recommended')}</h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {sections.recommended.map(room => (
                                                <RoomCard key={room._id} room={room} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Group 2: Popular */}
                                {sections.popular.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                                <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('rooms.listing.sections.popular')}</h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {sections.popular.map(room => (
                                                <RoomCard key={room._id} room={room} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Group 3: Others */}
                                {sections.others.length > 0 && (
                                    <section>
                                        {(sections.recommended.length > 0 || sections.popular.length > 0) && (
                                            <div className="flex items-center gap-2 mb-6 pt-4 border-t border-slate-100 dark:border-gray-800">
                                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('rooms.listing.sections.others')}</h2>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {sections.others.map(room => (
                                                <RoomCard key={room._id} room={room} />
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border-dashed border-2 border-slate-200 dark:border-gray-700 shadow-sm">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Users className="w-10 h-10 text-slate-300 dark:text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                    {searchTerm || filters.levels.length > 0 || filters.domains.length > 0 || filters.types.length > 0
                                        ? t('rooms.listing.empty.title')
                                        : t('rooms.listing.empty.titleEmpty')}
                                </h3>
                                <p className="text-slate-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                                    {searchTerm || filters.levels.length > 0 || filters.domains.length > 0 || filters.types.length > 0
                                        ? t('rooms.listing.empty.desc')
                                        : t('rooms.listing.empty.descEmpty')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    {(searchTerm || filters.levels.length > 0 || filters.domains.length > 0 || filters.types.length > 0) ? (
                                        <Button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilters({ levels: [], domains: [], types: [] });
                                                fetchData(); // Force a fresh fetch to ensure UI is in sync
                                            }}
                                            variant="primary"
                                        >
                                            {t('rooms.listing.empty.clearBtn')}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => {
                                                setLoading(true);
                                                fetchData();
                                            }}
                                            variant="outline"
                                            className="flex items-center gap-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                            {t('rooms.listing.empty.refreshBtn')}
                                        </Button>
                                    )}
                                    <Button
                                        variant={hasResults ? "outline" : "primary"}
                                        disabled={!eligibility?.eligible}
                                        onClick={() => navigate('/rooms/create')}
                                        className={!hasResults ? "" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}
                                    >
                                        {t('rooms.listing.createBtn')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default VirtualRoomListingPage;
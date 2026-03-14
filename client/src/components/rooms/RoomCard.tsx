import React from 'react';
import { Room } from '../../types';
import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Props expected by the RoomCard component
interface RoomCardProps {
    room: Room; // Room data object
}

// Main RoomCard component that displays a clickable card for a study room
const RoomCard: React.FC<RoomCardProps> = ({ room }) => {

    const navigate = useNavigate();
    const isFull = (room.memberCount || 0) >= room.maxParticipants;

    return (
        <div
            onClick={() => !isFull && navigate(`/rooms/${room._id}`)}
            className={`
                group relative bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col h-full overflow-hidden
                ${isFull
                    ? 'opacity-75 cursor-not-allowed bg-slate-50 dark:bg-gray-800'
                    : 'hover:shadow-xl dark:hover:shadow-gray-900/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-transparent hover:border-indigo-100 dark:hover:border-indigo-900'
                }
            `}
        >
            {/* Cover Image */}
            <div className="h-32 w-full bg-slate-100 dark:bg-gray-800 relative">
                {room.coverImage ? (
                    <img
                        src={room.coverImage}
                        alt={room.name}
                        loading="lazy"
                        className={`w-full h-full object-cover ${isFull ? 'grayscale opacity-75 dark:opacity-50' : ''}`}
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 ${isFull ? 'grayscale' : ''}`}></div>
                )}
            </div>

            {/* Content Wrapper */}
            <div className="p-5 flex flex-col flex-1">

                {/* Top Row: Type Badge (Public/ Private) */}
                <div className="flex justify-between items-start mb-3">
                    <span className={`
                        px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase
                        ${room.type === 'private'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }
                    `}>
                        {room.type}
                    </span>
                </div>

                {/* Room Name */}
                <h3 className={`text-xl font-serif font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 leading-tight ${!isFull && 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors'}`}>
                    {room.name}
                </h3>

                {/* Capacity Indicator */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-500 dark:text-gray-400">Capacity</span>
                        <span className={isFull ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-gray-300'}>
                            {room.memberCount || 0} / {room.maxParticipants} students
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${isFull ? 'bg-rose-500 dark:bg-rose-500' : 'bg-indigo-500 dark:bg-indigo-400'}`}
                            style={{ width: `${Math.min(((room.memberCount || 0) / room.maxParticipants) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Footer: Tags & Action */}
                <div className="mt-auto flex flex-col gap-4">

                    {/* Tags (Level & Domain) */}
                    <div className="flex flex-wrap gap-2">

                        {/* Education Level Tag */}
                        <span className="inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 text-xs font-medium rounded-lg">
                            {room.level}
                        </span>

                        {/* Domain Tag */}
                        {room.domainIds && room.domainIds.length > 0 && (
                            <span className="inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 text-xs font-medium rounded-lg capitalize">
                                {room.domainIds[0]}
                            </span>
                        )}
                    </div>

                    {/* Action State */}
                    <div className="flex justify-end border-t border-slate-50 dark:border-gray-800 pt-4">
                        {isFull ? (
                            <div className="flex items-center text-rose-500 dark:text-rose-400 font-bold text-sm">
                                <Lock className="w-3.5 h-3.5 mr-1.5" /> Room Full
                            </div>
                        ) : (
                            <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Join Session <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomCard;
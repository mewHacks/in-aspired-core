import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// MusicPlayer component to play background music using YouTube IFrame API

// Props passed from Room component (parent component)
interface MusicPlayerProps {
    isMicOn: boolean; // For mic ducking
}

// Global window interface declaration for TS to understand YouTube IFrame API
declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

// Define several radio stations for switching and autoplay
const STATIONS = [
    {
        id: 'lofi-girl',
        name: 'Lofi Girl',
        artist: 'Lofi Records',
        videoId: 'jfKfPfyJRdk',
        thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg'
    },
    {
        id: 'chillhop',
        name: 'Chillhop Raccoon',
        artist: 'Chillhop Music',
        videoId: '5yx6BWlEVcY',
        thumbnail: 'https://i.ytimg.com/vi/5yx6BWlEVcY/maxresdefault.jpg'
    },
    {
        id: 'synthwave',
        name: 'Synthwave Radio',
        artist: 'Lofi Girl',
        videoId: '4xDzrJKXOOY',
        thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/maxresdefault.jpg'
    }
];

// Main music player component
const MusicPlayer: React.FC<MusicPlayerProps> = ({ isMicOn }) => {

    // Define UI and player state variables
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(25); // User preferred volume
    const [isMuted, setIsMuted] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [error, setError] = useState(false);
    const [isOpen, setIsOpen] = useState(false); // Popover state
    const [currentStationIndex, setCurrentStationIndex] = useState(0); // Current station
    const { t } = useTranslation();

    // Ref variables
    const playerRef = useRef<any>(null); // For YouTube Player instance
    const containerRef = useRef<HTMLDivElement>(null); // To detect clicks outside popover

    // Get current station data
    const currentStation = STATIONS[currentStationIndex];

    // Initialize YouTube IFrame Player
    useEffect(() => {
        const initPlayer = () => {
            // Prevent multiple initializations
            if (playerRef.current) return;

            // Create new YT Player instance
            playerRef.current = new window.YT.Player('lofi-player', {
                height: '0',
                width: '0',
                videoId: STATIONS[0].videoId, // Initial station
                playerVars: {
                    'autoplay': 0,
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'modestbranding': 1,
                    'playsinline': 1,
                },
                events: {
                    // Fires when player is ready
                    'onReady': (event: any) => {
                        setPlayerReady(true);
                        event.target.setVolume(volume);
                    },
                    // Sync YouTube playback state with React state
                    'onStateChange': (event: any) => {
                        // YT.PlayerState.PLAYING = 1
                        setIsPlaying(event.data === 1);

                        // YT.PlayerState.ENDED = 0 (autoplay next station)
                        if (event.data === 0) {
                            handleTrackEnd();
                        }
                    },
                    // Handle unavailable streams or API issues
                    'onError': () => {
                        setError(true);
                        console.error("Radio unavailable");
                    }
                }
            });
        };

        // Check if the YouTube API is already loaded
        if (!window.YT) {
            // Create <script> tag to load the API (for lazy loading)
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";

            // Insert the tag into the DOM, this triggers the API load
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            // Register the global YouTube callback
            window.onYouTubeIframeAPIReady = initPlayer;

        } else { // If the API is already loaded, initialize immediately
            initPlayer();
        }

        // Cleanup on component unmount
        return () => {
            if (playerRef.current) {
                try {
                    // Remove the Iframe and stops video playback to prevent memory leaks
                    playerRef.current.destroy();
                    playerRef.current = null;
                } catch (e) { // Error handling
                    console.error("Error destroying player", e);
                }
            }
        };
    }, []); // Run once on mount

    // Handle track end (autoplay next station)
    const handleTrackEnd = () => {
        changeStation('next');
    };

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // If the popover is open and the click is outside the popover, close it
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        // Add event listener when popover is open
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Remove event listener when popover is closed
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Effect to handle station change, loads new video when station index changes
    useEffect(() => {
        if (playerRef.current && playerRef.current.loadVideoById && playerReady) {
            playerRef.current.loadVideoById(currentStation.videoId);
            // loadVideoById automatically starts playing
        }
    }, [currentStationIndex, playerReady]);

    // Helper to safely set volume
    const setPlayerVolume = (vol: number) => {
        if (playerRef.current && playerRef.current.setVolume) {
            playerRef.current.setVolume(vol);
        }
    };

    // Handle mic ducking
    useEffect(() => {
        // If the player is not ready, do nothing
        if (!playerReady) return;

        if (isMicOn) {
            // Duck/lower volume to 10% if mic is on
            setPlayerVolume(10);
        } else {
            // Restore user volume if mic is off
            setPlayerVolume(isMuted ? 0 : volume);
        }
    }, [isMicOn, volume, isMuted, playerReady]);

    // Handle internal volume change (slider)
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        // Get the new volume from the slider
        const newVol = parseInt(e.target.value);

        // Update the volume state and mute state if the mic is not on
        setVolume(newVol);
        setIsMuted(newVol === 0);

        // If mic is not on, update the player volume
        if (!isMicOn) {
            setPlayerVolume(newVol);
        }
    };

    // Toggle Play/Pause
    const togglePlay = () => {
        // If the player is not ready or the stream is unavailable, do nothing
        if (!playerReady || error) return;

        if (isPlaying) {
            // Pause the video
            playerRef.current.pauseVideo();
        } else {
            // Play the video
            playerRef.current.playVideo();
        }
        // Toggle the play state
        setIsPlaying(!isPlaying);
    };

    // Toggle mute
    const toggleMute = () => {
        // If the player is not ready or the stream is unavailable, do nothing
        if (isMuted) {

            // Unmute
            setIsMuted(false);

            // If mic is not on, restore volume to user's preference (default 25%)
            if (!isMicOn) setPlayerVolume(volume || 25);
        } else {

            // Mute
            setIsMuted(true);
            setPlayerVolume(0);
        }
    };

    // Change station manually
    const changeStation = (direction: 'next' | 'prev') => {
        setCurrentStationIndex(prevIndex => {
            const total = STATIONS.length;

            // If user click next, go to next station
            if (direction === 'next') {
                return (prevIndex + 1) % total;
            } else {  // If user click back, go to previous station
                return (prevIndex - 1 + total) % total;
            }
        });
    };

    // Render error state if the stream is unavailable
    if (error) {
        return (
            <div className="p-3.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 ring-2 ring-rose-100 dark:ring-rose-900/30 cursor-not-allowed opacity-50" title={t('virtualRoom.music.unavailable')}>
                <Music className="w-5 h-5" />
            </div>
        );
    }

    return (
        // Render JSX
        <div className="relative" ref={containerRef}>

            {/* Hidden Player Container */}
            <div id="lofi-player" className="absolute opacity-0 pointer-events-none h-0 w-0 overflow-hidden"></div>

            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-3.5 rounded-full transition-all duration-200 group relative ${isPlaying
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-inner ring-2 ring-indigo-50 dark:ring-indigo-900/30'
                    : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
            >
                {/* Music Icon with pulsing animation when playing */}
                <Music className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />

                {/* Hover Tooltip - Now Playing Info */}
                <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max bg-slate-800 dark:bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-700 dark:border-gray-700">
                    <div className="font-medium">{t('virtualRoom.music.nowPlaying')} {currentStation.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-gray-500 font-normal mt-0.5">{t('virtualRoom.music.onlyYou')}</div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-gray-900"></div>
                </div>
            </button>

            {/* Config Popover */}
            {isOpen && (
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-slate-100 dark:border-gray-800 z-[60] flex flex-col items-center gap-4 w-52 animate-fade-in">

                    {/* Vinyl Record Container */}
                    <div className={`relative w-28 h-28 rounded-full shadow-xl border-4 border-slate-900 dark:border-gray-700 bg-slate-950 dark:bg-gray-800 flex items-center justify-center transition-all duration-1000 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}>
                        {/* Vinyl Grooves */}
                        <div className="absolute inset-0 rounded-full border-[6px] border-slate-800/50 dark:border-gray-600/50"></div>
                        <div className="absolute inset-2.5 rounded-full border-[6px] border-slate-800/50 dark:border-gray-600/50"></div>
                        <div className="absolute inset-5 rounded-full border-[6px] border-slate-800/50 dark:border-gray-600/50"></div>

                        {/* Center Label */}
                        <div className="relative w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-slate-900 dark:border-gray-700 overflow-hidden">
                            <img
                                src={currentStation.thumbnail}
                                alt={currentStation.name}
                                className="w-full h-full object-cover opacity-90"
                            />
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="text-center space-y-0.5 w-full">
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate px-2">{currentStation.name}</h3>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 truncate px-2">{currentStation.artist}</p>
                    </div>

                    {/* Controls */}
                    <div className="w-full flex flex-col gap-3 bg-slate-50 dark:bg-gray-800 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-700">
                        {/* Playback Controls Row */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => changeStation('prev')}
                                className="text-slate-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
                                title={t('virtualRoom.music.prevStation')}
                            >
                                <SkipBack className="w-4 h-4 fill-current" />
                            </button>

                            <button
                                onClick={togglePlay}
                                disabled={!playerReady}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isPlaying
                                    ? 'bg-indigo-500 text-white shadow-indigo-200 dark:shadow-indigo-950/30 hover:bg-indigo-600 hover:scale-105 active:scale-95'
                                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:shadow-md'
                                    }`}
                            >
                                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                            </button>

                            <button
                                onClick={() => changeStation('next')}
                                className="text-slate-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
                                title={t('virtualRoom.music.nextStation')}
                            >
                                <SkipForward className="w-4 h-4 fill-current" />
                            </button>
                        </div>

                        {/* Volume Slider Group */}
                        <div className="flex items-center gap-2 w-full px-1">
                            {/* Volume Control Icon */}
                            <button onClick={toggleMute} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-400 transition-colors">
                                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>

                            {/* Volume Slider */}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                style={{
                                    background: `linear-gradient(to right, #6366f1 ${isMuted ? 0 : volume}%, #e2e8f0 ${isMuted ? 0 : volume}%)`
                                }}
                                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:scale-110 dark:[&::-webkit-slider-thumb]:bg-indigo-400"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MusicPlayer;
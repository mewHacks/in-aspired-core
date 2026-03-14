import React from 'react';

export interface MarqueeItem {
    name: string;
    logo: string;
    url: string;
    className?: string; // Optional custom styling for size adjustments
}

// Props for the Marquee component  
interface MarqueeProps {
    items: MarqueeItem[];
    speed?: number; // seconds for one complete cycle
}

// Main Marquee component
const Marquee: React.FC<MarqueeProps> = ({ items, speed = 40 }) => {
    return (
        <div className="relative flex overflow-x-hidden bg-white dark:bg-transparent py-12 border-b border-gray-100 dark:border-gray-800 group">
            <div
                className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]"
                style={{ animationDuration: `${speed}s` }}
            >
                {items.map((item, index) => (
                    <MarqueeItemComponent key={`mq-1-${index}`} item={item} />
                ))}
            </div>

            {/* Duplicate for seamless loop */}
            <div
                className="absolute top-0 py-12 flex animate-marquee2 whitespace-nowrap group-hover:[animation-play-state:paused]"
                style={{ animationDuration: `${speed}s` }}
            >
                {items.map((item, index) => (
                    <MarqueeItemComponent key={`mq-2-${index}`} item={item} />
                ))}
            </div>
        </div>
    );
};

// Individual item component inside marquee
const MarqueeItemComponent = ({ item }: { item: MarqueeItem }) => (
    <div className="mx-8 flex items-center justify-center min-w-[200px] h-64">

        {/* Individual item link */}
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-all duration-300 transform hover:scale-110 grayscale hover:grayscale-0 dark:grayscale dark:hover:grayscale-0 dark:hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
        >
            {/* Logo image */}
            <img
                src={item.logo}
                alt={item.name}
                className={`w-auto object-contain ${item.className || 'h-32 max-w-[240px]'} dark:brightness-90 dark:contrast-125`}
                onError={(e) => {
                    // Fallback if logo fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerText = item.name;
                }}
            />
        </a>
    </div>
);

export default Marquee;
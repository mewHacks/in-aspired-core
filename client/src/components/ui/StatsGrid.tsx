// Animated statistics grid displaying key metrics with counting animation
import React from 'react';

interface StatItem {
  value: string;
  label: string;
  bgColor?: string;
  textColor?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  className?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ 
  stats, 
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div 
          key={index}
          className={`text-center p-3 rounded-xl ${
            stat.bgColor || 'bg-primary-50'
          }`}
        >
          <div className={`font-bold text-xl ${
            stat.textColor || 'text-primary-600'
          }`}>
            {stat.value}
          </div>
          <div className="text-xs text-gray-500">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};
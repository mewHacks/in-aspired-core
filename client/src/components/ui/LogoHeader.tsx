// Logo header component with theme-aware light/dark logo variants
import React from 'react';
import { useTranslation } from 'react-i18next';

interface LogoHeaderProps {
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LogoHeader: React.FC<LogoHeaderProps> = ({
  title,
  subtitle,
  size = 'md'
}) => {
  const { t } = useTranslation();

  const displayTitle = title || t('ui.logoHeader.title');
  const displaySubtitle = subtitle || t('ui.logoHeader.subtitle');
  const sizes = {
    sm: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      title: 'text-2xl',
      subtitle: 'text-xs'
    },
    md: {
      container: 'w-24 h-24',
      icon: 'w-12 h-12',
      title: 'text-4xl',
      subtitle: 'text-sm'
    },
    lg: {
      container: 'w-32 h-32',
      icon: 'w-16 h-16',
      title: 'text-5xl',
      subtitle: 'text-base'
    }
  };

  return (
    <div className="text-center">
      <div className="flex flex-row items-center justify-center gap-6 mb-6">

        {/* Logo - Shows different versions based on theme */}
        <div className={`relative ${sizes[size].container} bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden group border border-white/60 dark:border-gray-700/60 flex-shrink-0`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/80 to-indigo-100/50 dark:from-gray-800/80 dark:to-indigo-900/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Light mode logo */}
          <img
            src="/assets/icons/logo_light.svg"
            alt="Logo"
            className={`${sizes[size].icon} relative z-10 drop-shadow-lg transform transition-transform duration-500 group-hover:scale-110 dark:hidden`}
          />
          
          {/* Dark mode logo */}
          <img
            src="/assets/icons/logo_dark.svg"
            alt="Logo"
            className={`${sizes[size].icon} relative z-10 drop-shadow-lg transform transition-transform duration-500 group-hover:scale-110 hidden dark:block`}
          />
        </div>

        {/* Text Content */}
        <div className="text-left">
          <h1 className={`font-serif font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight ${sizes[size].title}`}>
            {displayTitle}
          </h1>
          <p className={`text-indigo-600/80 dark:text-indigo-400/80 uppercase font-medium tracking-widest ${sizes[size].subtitle}`}>
            {displaySubtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
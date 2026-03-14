// Floating back/home navigation button for detail pages
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

interface FloatingBackButtonProps {
  to?: string;
  label?: string;
  showIcon?: boolean;
}

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  to = '/',
  label = 'Home',
  showIcon = true,
}) => {
  return (
    <Link
      to={to}
      className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 hover:shadow-xl hover:bg-white transition-all duration-200 group hover:scale-[1.02] active:scale-95"
    >
      {showIcon && (
        <ArrowLeft className="h-5 w-5 text-gray-700 group-hover:-translate-x-0.5 transition-transform" />
      )}
      <span className="font-medium text-gray-700">{label}</span>
    </Link>
  );
};

// Variant with Home icon
export const FloatingHomeButton: React.FC = () => {
  return (
    <Link
      to="/"
      className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 hover:shadow-xl hover:bg-white transition-all duration-200 group hover:scale-[1.02]"
    >
      <Home className="h-5 w-5 text-gray-700" />
      <span className="font-medium text-gray-700">Home</span>
    </Link>
  );
};
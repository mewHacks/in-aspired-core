// Reusable card wrapper component with optional hover animation
import React, { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  withAnimation?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  className = '',
  withAnimation = false,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${className} ${withAnimation ? 'animate-fade-in' : ''
        }`.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
import React from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'nav';
  className?: string;
  showText?: boolean;
}

export function BrandLogo({ size = 'md', className = '', showText = false }: BrandLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl text-sm',
    md: 'w-9 h-9 rounded-xl text-base',
    lg: 'w-12 h-12 rounded-2xl text-xl',
    nav: 'w-8 h-8 md:w-9 md:h-9 rounded-xl text-sm md:text-base',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <div
        className={`${sizeClasses} bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-warm text-white font-black tracking-tight shrink-0 select-none transition-transform group-hover:scale-105`}
        aria-hidden="true"
      >
        UIU
      </div>
      {showText && (
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-base font-semibold text-text-primary tracking-tight truncate">
              Routine Builder
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
              Fall 2026
            </span>
          </div>
          <p className="text-xs text-text-muted hidden sm:block truncate">
            Dept. of CSE &amp; Data Science
          </p>
        </div>
      )}
    </div>
  );
}

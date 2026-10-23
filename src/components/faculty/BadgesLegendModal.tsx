'use client';

import React, { useEffect } from 'react';
import {
  X,
  Award,
  Bell,
  Moon,
  FlaskConical,
  BookOpen,
  Flame,
  Calendar,
  Zap,
  Building2,
  Home,
  Boxes,
  GitFork,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { getAllBadgeDefinitions, BadgeDefinition } from '../../config/facultyBadges';

interface BadgesLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function BadgeIcon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  switch (name) {
    case 'Flame':
      return <Flame className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'GitFork':
      return <GitFork className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Boxes':
      return <Boxes className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'Bell':
      return <Bell className={className} />;
    case 'Moon':
      return <Moon className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export { BadgeIcon };

export function BadgesLegendModal({ isOpen, onClose }: BadgesLegendModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const badges = getAllBadgeDefinitions();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badges-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 id="badges-modal-title" className="text-lg font-bold text-stone-900">
                Faculty Badges & Achievements
              </h2>
              <p className="text-xs text-stone-500">
                12 automated badges highlighting unique teaching patterns and campus footprints.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            aria-label="Close badges legend"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badges List */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-stone-100 space-y-3">
          {badges.map((b) => (
            <div key={b.id} className="pt-3 first:pt-0 flex items-start gap-3.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shrink-0 ${b.badgeStyle}`}
              >
                <BadgeIcon name={b.iconName} className="w-3.5 h-3.5" />
                {b.name}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-700 font-medium leading-relaxed">{b.description}</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Priority #{b.priority}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Star, Download, Calendar, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { FacultyStats } from '../../../lib/facultyStats';
import { usePinnedFaculty } from '../../../hooks/usePinnedFaculty';
import { exportFacultyToICS, exportFacultyToPNG, downloadTextFile } from '../../../utils/exportFacultySchedule';

interface FacultyDetailActionsProps {
  faculty: FacultyStats;
}

export function FacultyDetailActions({ faculty }: FacultyDetailActionsProps) {
  const [copied, setCopied] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const { isPinned, togglePin } = usePinnedFaculty();
  const menuRef = useRef<HTMLDivElement>(null);

  const pinned = isPinned(faculty.id);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    if (downloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [downloadMenuOpen]);

  const handleCopy = async () => {
    try {
      if (typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleDownloadICS = () => {
    const icsContent = exportFacultyToICS(faculty);
    downloadTextFile(icsContent, `${faculty.id}-schedule.ics`, 'text/calendar');
    setDownloadMenuOpen(false);
  };

  const handleDownloadPNG = () => {
    exportFacultyToPNG(faculty);
    setDownloadMenuOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Pin / Star Button */}
      <button
        type="button"
        onClick={() => togglePin(faculty.id)}
        className={`min-h-[36px] px-3 rounded-btn border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer ${
          pinned
            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            : 'bg-white hover:bg-orange-50 border-stone-200 text-stone-700 hover:text-orange-600'
        }`}
        aria-label={pinned ? `Unpin ${faculty.name}` : `Pin ${faculty.name}`}
        title={pinned ? 'Pinned faculty member' : 'Pin to My Faculty'}
      >
        <Star className={`w-3.5 h-3.5 ${pinned ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
        <span>{pinned ? 'Pinned' : 'Pin'}</span>
      </button>

      {/* Copy Link Button */}
      <button
        type="button"
        onClick={handleCopy}
        className="min-h-[36px] px-3 rounded-btn bg-white hover:bg-orange-50 border border-stone-200 hover:border-orange-200 text-stone-700 hover:text-orange-600 font-medium text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
        title="Copy link to this faculty schedule"
        aria-label="Copy link to this faculty schedule"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-semibold">Link copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-orange-500" />
            <span>Copy link</span>
          </>
        )}
      </button>

      {/* Download Schedule Dropdown Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
          className="min-h-[36px] px-3 rounded-btn bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          aria-expanded={downloadMenuOpen}
          aria-haspopup="true"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download schedule</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {downloadMenuOpen && (
          <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={handleDownloadPNG}
              className="w-full px-3.5 py-2 text-left text-xs text-stone-700 hover:bg-orange-50 hover:text-orange-900 flex items-center gap-2.5 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <p className="font-semibold">Schedule Card (PNG)</p>
                <p className="text-[11px] text-stone-400">High-res shareable image</p>
              </div>
            </button>

            <button
              onClick={handleDownloadICS}
              className="w-full px-3.5 py-2 text-left text-xs text-stone-700 hover:bg-orange-50 hover:text-orange-900 flex items-center gap-2.5 transition-colors border-t border-stone-100"
            >
              <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <p className="font-semibold">iCal Calendar (.ics)</p>
                <p className="text-[11px] text-stone-400">Sync with Google/Apple Cal</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import {
  Github,
  Linkedin,
  Mail,
  MessageSquarePlus,
  ExternalLink,
  BookOpen,
  Calendar,
  Bookmark,
} from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '../config/site';

interface SiteFooterProps {
  className?: string;
  onOpenSavedRoutines?: () => void;
}

export function SiteFooter({ className = '', onOpenSavedRoutines }: SiteFooterProps) {
  return (
    <footer
      className={`border-t border-app-border bg-surface text-text-muted py-3 md:py-3.5 ${className}`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-2.5">
        {/* Row 1: Creator Credit & Social / Feedback Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
          {/* Creator Credit: 13px font-medium, name semibold in primary text */}
          <p className="text-[13px] font-medium text-text-muted md:whitespace-nowrap leading-tight">
            {siteConfig.creator.creditPrefix}{' '}
            <span className="font-semibold text-text-primary">
              {siteConfig.creator.name}
            </span>
            {' · '}
            {siteConfig.creator.department}, {siteConfig.creator.university}
          </p>

          {/* Icon Buttons & Feedback Link */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* GitHub */}
            {siteConfig.creator.github && (
              <a
                href={siteConfig.creator.github}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-orange-50/70 hover:bg-orange-100 border border-orange-200/80 hover:border-orange-300 text-text-secondary hover:text-orange-600 flex items-center justify-center transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 relative after:absolute after:-inset-1.5 after:content-['']"
                aria-label={siteConfig.creator.labels.github}
                title={siteConfig.creator.labels.github}
              >
                <Github className="w-4 h-4 shrink-0" />
              </a>
            )}

            {/* LinkedIn */}
            {siteConfig.creator.linkedin && (
              <a
                href={siteConfig.creator.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-orange-50/70 hover:bg-orange-100 border border-orange-200/80 hover:border-orange-300 text-text-secondary hover:text-orange-600 flex items-center justify-center transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 relative after:absolute after:-inset-1.5 after:content-['']"
                aria-label={siteConfig.creator.labels.linkedin}
                title={siteConfig.creator.labels.linkedin}
              >
                <Linkedin className="w-4 h-4 shrink-0" />
              </a>
            )}

            {/* Email */}
            {siteConfig.creator.email && (
              <a
                href={siteConfig.creator.email}
                className="w-8 h-8 rounded-full bg-orange-50/70 hover:bg-orange-100 border border-orange-200/80 hover:border-orange-300 text-text-secondary hover:text-orange-600 flex items-center justify-center transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 relative after:absolute after:-inset-1.5 after:content-['']"
                aria-label={siteConfig.creator.labels.email}
                title={siteConfig.creator.labels.email}
              >
                <Mail className="w-4 h-4 shrink-0" />
              </a>
            )}

            {/* Quiet Outline Feedback Button */}
            {siteConfig.feedback.url && (
              <a
                href={siteConfig.feedback.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2.5 rounded-btn bg-surface hover:bg-orange-50/60 border border-app-border hover:border-orange-200 text-text-primary hover:text-orange-600 font-medium text-[12px] inline-flex items-center gap-1.5 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 shrink-0"
                title={siteConfig.feedback.label}
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>{siteConfig.feedback.label}</span>
              </a>
            )}
          </div>
        </div>

        {/* Row 2: Divider & Disclaimer + Nav Links */}
        <div className="pt-2 border-t border-app-border/60 flex flex-col md:flex-row items-center justify-between gap-2 text-[12px]">
          {/* Disclaimer on left */}
          <p className="text-text-muted text-center md:text-left max-w-2xl leading-normal">
            <span className="font-medium text-text-secondary">{siteConfig.copyright}</span>{' '}
            {siteConfig.disclaimer}
          </p>

          {/* Navigation Links on right */}
          <div className="flex items-center gap-3 text-text-secondary flex-wrap justify-center shrink-0">
            {onOpenSavedRoutines ? (
              <button
                type="button"
                onClick={onOpenSavedRoutines}
                className="hover:text-orange-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Bookmark className="w-3 h-3 text-orange-500" />
                <span>Saved Routines</span>
              </button>
            ) : (
              <Link
                href="/builder?saved=true"
                className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
              >
                <Bookmark className="w-3 h-3 text-orange-500" />
                <span>Saved Routines</span>
              </Link>
            )}
            <span className="text-text-muted/60" aria-hidden="true">•</span>
            <Link
              href={siteConfig.links.routineBuilder}
              className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            >
              <Calendar className="w-3 h-3 text-orange-500" />
              <span>Routine Builder</span>
            </Link>
            <span className="text-text-muted/60" aria-hidden="true">•</span>
            <Link
              href={siteConfig.links.courseDirectory}
              className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-orange-500" />
              <span>Course Directory</span>
            </Link>
            <span className="text-text-muted/60" aria-hidden="true">•</span>
            <a
              href={siteConfig.links.userGuide}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            >
              <span>User Guide</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

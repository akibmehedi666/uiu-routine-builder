import React from 'react';
import Link from 'next/link';
import {
  Github,
  Linkedin,
  Mail,
  MessageSquarePlus,
  ExternalLink,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { siteConfig } from '../config/site';

interface SiteFooterProps {
  className?: string;
  compact?: boolean;
}

export function SiteFooter({ className = '', compact = false }: SiteFooterProps) {
  return (
    <footer
      className={`border-t border-app-border bg-surface text-text-muted text-xs ${
        compact ? 'py-5' : 'py-8'
      } ${className}`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-4">
        {/* Creator Info & Social Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-semibold text-text-primary text-[13px] tracking-tight">
              {siteConfig.creator.creditText}
            </p>
            <p className="text-[11px] text-text-muted">
              {siteConfig.name} • {siteConfig.trimester}
            </p>
          </div>

          {/* Social Icons & Feedback Link */}
          <div className="flex items-center gap-3">
            {/* GitHub */}
            {siteConfig.creator.github && (
              <a
                href={siteConfig.creator.github}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-subtle hover:bg-orange-50 border border-app-border hover:border-orange-200 text-text-secondary hover:text-orange-600 flex items-center justify-center transition-colors shadow-2xs"
                aria-label="GitHub Profile"
                title="GitHub: Md. Akib Mehedi"
              >
                <Github className="w-4 h-4" />
              </a>
            )}

            {/* LinkedIn */}
            {siteConfig.creator.linkedin && (
              <a
                href={siteConfig.creator.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-subtle hover:bg-orange-50 border border-app-border hover:border-orange-200 text-text-secondary hover:text-orange-600 flex items-center justify-center transition-colors shadow-2xs"
                aria-label="LinkedIn Profile"
                title="LinkedIn: Md. Akib Mehedi"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}

            {/* Email */}
            {siteConfig.creator.email && (
              <a
                href={siteConfig.creator.email}
                className="w-8 h-8 rounded-full bg-subtle hover:bg-orange-50 border border-app-border hover:border-orange-200 text-text-secondary hover:text-orange-600 flex items-center justify-center transition-colors shadow-2xs"
                aria-label="Send Email"
                title="Email: akibmehedi666@gmail.com"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}

            <span className="w-px h-5 bg-app-border mx-1" aria-hidden="true" />

            {/* Report wrong section / Feedback */}
            {siteConfig.feedback.url && (
              <a
                href={siteConfig.feedback.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-btn bg-subtle hover:bg-orange-50 border border-app-border hover:border-orange-200 text-text-secondary hover:text-orange-600 font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Report an error in class timings, rooms, or submit feedback"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-orange-500" />
                <span>{siteConfig.feedback.label}</span>
              </a>
            )}
          </div>
        </div>

        {/* Disclaimer & Nav Links */}
        <div className="pt-3 border-t border-app-border/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px]">
          <p className="text-text-muted text-center sm:text-left max-w-2xl">
            {siteConfig.disclaimer}
          </p>

          <div className="flex items-center gap-3 text-text-secondary flex-wrap justify-center">
            <Link
              href={siteConfig.links.routineBuilder}
              className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            >
              <Calendar className="w-3 h-3 text-orange-500" />
              <span>Routine Builder</span>
            </Link>
            <span>•</span>
            <Link
              href={siteConfig.links.courseDirectory}
              className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-orange-500" />
              <span>Course Directory</span>
            </Link>
            <span>•</span>
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

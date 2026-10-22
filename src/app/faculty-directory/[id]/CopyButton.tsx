'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback gracefully
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="min-h-[36px] sm:h-8 px-3 rounded-btn bg-surface hover:bg-orange-50 border border-app-border hover:border-orange-200 text-text-primary hover:text-orange-600 font-medium text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
  );
}

'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ReplyPreviewProps {
  senderName: string;
  messageText: string;
  onCancel: () => void;
}

export function ReplyPreview({
  senderName,
  messageText,
  onCancel
}: ReplyPreviewProps) {
  return (
    <div className="px-3 py-2 rounded-lg bg-[var(--ck-blue)]/5 border-l-4 border-[var(--ck-blue)] flex items-start justify-between gap-3 mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[var(--ck-blue)] mb-0.5 uppercase tracking-wider">
          ↳ Replying to
        </p>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          {senderName}
        </p>
        <p className="text-[12px] text-[var(--text-secondary)] truncate italic">
          "{messageText}"
        </p>
      </div>
      <button
        onClick={onCancel}
        className="flex-shrink-0 p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded hover:bg-[var(--bg-surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--ck-blue)]"
        title="Cancel reply"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

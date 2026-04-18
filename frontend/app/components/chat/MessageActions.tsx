'use client';

import React, { useRef, useEffect } from 'react';
import {
  FaceSmileIcon,
  ArrowUturnLeftIcon,
  MapPinIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

interface MessageActionsProps {
  isOpen: boolean;
  onOpenReactions: () => void;
  onReply: () => void;
  onPin: () => void;
  onClose: () => void;
  isPinned?: boolean;
}

export function MessageActions({
  isOpen,
  onOpenReactions,
  onReply,
  onPin,
  onClose,
  isPinned = false
}: MessageActionsProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const buttons = menuRef.current?.querySelectorAll('button');
      if (!buttons) return;

      const activeElement = document.activeElement;
      const isFirstButton = activeElement === buttons[0];
      const isLastButton = activeElement === buttons[buttons.length - 1];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextButton = isLastButton ? buttons[0] : buttons[Array.from(buttons).indexOf(activeElement as HTMLButtonElement) + 1];
        (nextButton as HTMLButtonElement)?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevButton = isFirstButton ? buttons[buttons.length - 1] : buttons[Array.from(buttons).indexOf(activeElement as HTMLButtonElement) - 1];
        (prevButton as HTMLButtonElement)?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`
        absolute top-full right-0 mt-1 z-40
        bg-white dark:bg-[var(--bg-surface-2)]
        rounded-lg shadow-lg border border-[var(--border-subtle)]
        overflow-hidden min-w-max animate-in fade-in zoom-in-95 duration-150
      `}
    >
      <button
        onClick={() => {
          onOpenReactions();
          onClose();
        }}
        className={`
          w-full px-4 py-2 flex items-center gap-3
          text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] dark:hover:bg-[var(--bg-surface-3)]
          transition-colors text-sm font-medium
          focus:outline-none focus:bg-[var(--bg-surface-2)]
        `}
      >
        <FaceSmileIcon className="w-4 h-4" />
        React
      </button>

      <button
        onClick={() => {
          onReply();
          onClose();
        }}
        className={`
          w-full px-4 py-2 flex items-center gap-3
          text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] dark:hover:bg-[var(--bg-surface-3)]
          transition-colors text-sm font-medium
          focus:outline-none focus:bg-[var(--bg-surface-2)]
        `}
      >
        <ArrowUturnLeftIcon className="w-4 h-4" />
        Reply
      </button>

      <button
        onClick={() => {
          onPin();
          onClose();
        }}
        className={`
          w-full px-4 py-2 flex items-center gap-3
          ${isPinned ? 'text-[var(--ck-blue)]' : 'text-[var(--text-primary)]'}
          hover:bg-[var(--bg-surface-2)] dark:hover:bg-[var(--bg-surface-3)]
          transition-colors text-sm font-medium
          focus:outline-none focus:bg-[var(--bg-surface-2)]
        `}
      >
        <MapPinIcon className="w-4 h-4" />
        {isPinned ? 'Unpin' : 'Pin'}
      </button>
    </div>
  );
}

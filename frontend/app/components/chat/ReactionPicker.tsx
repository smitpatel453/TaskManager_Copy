'use client';

import React, { useRef, useEffect, useState } from 'react';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ReactionPickerProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ReactionPicker({
  isOpen,
  onSelect,
  onClose,
  position = 'bottom'
}: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;

    // Find the parent message or container to position relative to it
    const messageElement = pickerRef.current?.closest('[id^="msg-"]') as HTMLElement;
    if (messageElement) {
      const rect = messageElement.getBoundingClientRect();
      // Position above the message
      setCoords({
        top: rect.top + window.scrollY - 60,
        left: rect.left + window.scrollX + rect.width / 2 - 80 // Center horizontally
      });
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 50,
      }}
      className={`
        bg-white dark:bg-[var(--bg-surface-2)]
        rounded-xl shadow-lg border border-[var(--border-subtle)]
        p-2 flex gap-1 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto
      `}
    >
      {EMOJI_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className={`
            w-8 h-8 flex items-center justify-center rounded-lg
            hover:bg-[var(--bg-surface-2)] dark:hover:bg-[var(--bg-surface-3)]
            transition-colors cursor-pointer text-lg
            focus:outline-none focus:ring-2 focus:ring-[var(--ck-blue)] focus:ring-offset-1
          `}
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

'use client';

import React from 'react';

interface ReactionBarProps {
  reactions: { emoji: string; count: number }[];
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  userReactions: string[];
}

export function ReactionBar({
  reactions,
  onReact,
  onRemoveReaction,
  userReactions
}: ReactionBarProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2 z-20 relative">
      {reactions.map(({ emoji, count }) => {
        const userHasReacted = userReactions.includes(emoji);

        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const userHasReacted = userReactions.includes(emoji);
              if (userHasReacted) {
                onRemoveReaction(emoji);
              } else {
                onReact(emoji);
              }
            }}
            type="button"
            className={`
              px-2 py-1 rounded-full text-sm font-medium
              transition-all duration-200 flex items-center gap-1 cursor-pointer
              ${userHasReacted
                ? 'bg-[var(--ck-blue)]/15 border border-[var(--ck-blue)]/40'
                : 'bg-[var(--bg-surface)] dark:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]'
              }
              hover:bg-[var(--bg-surface-2)] dark:hover:bg-[var(--bg-surface-3)] active:scale-95
              focus:outline-none focus:ring-2 focus:ring-[var(--ck-blue)]
            `}
            title={`${count} reaction${count > 1 ? 's' : ''}`}
          >
            <span className="pointer-events-none">{emoji}</span>
            {count > 1 && <span className="text-xs pointer-events-none">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

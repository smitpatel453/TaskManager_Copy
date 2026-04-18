import { useCallback } from 'react';

interface MessageInteraction {
  reactions: { emoji: string; count: number }[];
  userReactions: string[];
  replyTo: {
    _id: string;
    senderName: string;
    messageText: string;
  } | null;
  isPinned: boolean;
}

interface UseMessageActionsReturn {
  addReaction: (messageId: string, emoji: string, userId: string) => void;
  removeReaction: (messageId: string, emoji: string, userId: string) => void;
  setReply: (messageId: string, senderName: string, messageText: string) => void;
  clearReply: () => void;
  togglePin: (messageId: string) => void;
  getMessageInteraction: (messageId: string) => MessageInteraction | null;
  getReplyTo: () => MessageInteraction['replyTo'] | null;
}

export function useMessageActions(): UseMessageActionsReturn {
  // Store interactions in localStorage with key: `message-interaction-${messageId}`
  const addReaction = useCallback((messageId: string, emoji: string, userId: string) => {
    const key = `message-reaction-${messageId}-${userId}`;
    const existing = localStorage.getItem(key) || '';
    if (!existing.includes(emoji)) {
      localStorage.setItem(key, existing + emoji);
    }
  }, []);

  const removeReaction = useCallback((messageId: string, emoji: string, userId: string) => {
    const key = `message-reaction-${messageId}-${userId}`;
    const existing = localStorage.getItem(key) || '';
    localStorage.setItem(key, existing.replace(emoji, ''));
  }, []);

  const setReply = useCallback((messageId: string, senderName: string, messageText: string) => {
    localStorage.setItem('reply-to', JSON.stringify({ messageId, senderName, messageText }));
  }, []);

  const clearReply = useCallback(() => {
    localStorage.removeItem('reply-to');
  }, []);

  const togglePin = useCallback((messageId: string) => {
    const key = `message-pinned-${messageId}`;
    const isPinned = localStorage.getItem(key) === 'true';
    localStorage.setItem(key, String(!isPinned));
  }, []);

  const getMessageInteraction = useCallback((messageId: string): MessageInteraction | null => {
    // This would be enhanced to fetch from backend
    return null;
  }, []);

  const getReplyTo = useCallback((): MessageInteraction['replyTo'] | null => {
    const data = localStorage.getItem('reply-to');
    return data ? JSON.parse(data) : null;
  }, []);

  return {
    addReaction,
    removeReaction,
    setReply,
    clearReply,
    togglePin,
    getMessageInteraction,
    getReplyTo
  };
}

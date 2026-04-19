import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../providers/SocketProvider';
import { inboxApi, InboxMessage } from '../../src/api/inbox.api';
import axios from 'axios';

export function useNotifications() {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      // Check if user is authenticated (token exists)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await inboxApi.getMessages(50, 0);
      setNotifications(response.messages);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      // Silently handle 401 errors (user not authenticated)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.info('User not authenticated, skipping notifications load');
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.error('Error loading notifications:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial notifications and listen for auth changes
  useEffect(() => {
    loadNotifications();
    
    // Listen for storage changes (token updates on same tab)
    const handleStorageChange = () => {
      loadNotifications();
    };
    
    // Listen for custom auth events
    const handleAuthChange = () => {
      loadNotifications();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [loadNotifications]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotification = (notification: Partial<InboxMessage>) => {
      setNotifications((prev) => [notification as InboxMessage, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      console.log('📬 Real-time notification received:', notification);
    };

    socket.on('notification:received', handleNotification);

    return () => {
      socket.off('notification:received', handleNotification);
    };
  }, [socket, isConnected]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await inboxApi.markMessageAsRead(messageId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === messageId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await inboxApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (messageId: string) => {
    try {
      await inboxApi.deleteMessage(messageId);
      setNotifications((prev) => prev.filter((n) => n._id !== messageId));
      // If unread, decrement count
      const notification = notifications.find((n) => n._id === messageId);
      if (notification?.isRead === false) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}

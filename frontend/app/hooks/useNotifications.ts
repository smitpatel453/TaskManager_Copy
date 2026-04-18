import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../providers/SocketProvider';
import { inboxApi, InboxMessage } from '../../src/api/inbox.api';

export function useNotifications() {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inboxApi.getMessages(50, 0);
      setNotifications(response.messages);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: string;
}

export function NotificationToastContainer() {
  const router = useRouter();
  const { notifications: allNotifications, loading } = useNotifications();
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [lastSeenNotificationIds, setLastSeenNotificationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show toasts for all unread notifications that we haven't shown as a toast yet
    const unreadNotifications = allNotifications.filter(notif => !notif.isRead);
    
    if (unreadNotifications.length > 0) {
      // Only create toasts for notifications we haven't seen before
      const newUnseenNotifications = unreadNotifications.filter(
        notif => !lastSeenNotificationIds.has(notif._id)
      );
      
      if (newUnseenNotifications.length > 0) {
        const newToasts = newUnseenNotifications.map(notif => ({
          id: notif._id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
        }));
        
        setToasts((prev) => [...prev, ...newToasts]);
        
        // Update the set of seen notifications
        setLastSeenNotificationIds(prev => {
          const updated = new Set(prev);
          newUnseenNotifications.forEach(n => updated.add(n._id));
          return updated;
        });
        
        // Auto-hide each new toast after 5 seconds
        newUnseenNotifications.forEach((notif) => {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== notif._id));
          }, 5000);
        });
      }
    }
  }, [allNotifications, lastSeenNotificationIds]);

  return (
    <div className="fixed top-20 right-6 z-[9999] pointer-events-none max-w-[400px]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="mb-3 pointer-events-auto"
          >
            <div 
              onClick={() => {
                // Navigate to inbox with notification ID to expand it
                router.push(`/dashboard/inbox?expandNotification=${toast.id}`);
                // Remove toast
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-lg backdrop-blur-sm cursor-pointer hover:bg-[var(--bg-surface-2)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {toast.title}
                  </h3>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0 mt-0.5"
                >
                  <i className="pi pi-times text-[12px]" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

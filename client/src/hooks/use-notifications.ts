import { useLiveQuery } from 'dexie-react-hooks';
import db, { AppNotification } from '@/lib/db';
import { 
  requestBrowserNotificationPermission, 
  dispatchBrowserNotification, 
  runAllNotificationChecks,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported
} from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const notifications = useLiveQuery(() => 
    db.notifications.orderBy('createdAt').reverse().toArray()
  ) || [];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}

export function useNotificationActions() {
  const { toast } = useToast();

  const markAsRead = async (id: string) => {
    try {
      await db.notifications.update(id, { isRead: true });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = await db.notifications.filter(n => !n.isRead).toArray();
      const updates = unread.map(n => db.notifications.update(n.id, { isRead: true }));
      await Promise.all(updates);
      toast({
        title: "All Caught Up!",
        description: "Marked all notifications as read.",
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await db.notifications.delete(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await db.notifications.clear();
      toast({
        title: "Notifications Cleared",
        description: "All notifications have been removed.",
      });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const requestPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      toast({
        title: "Notifications Enabled!",
        description: "You'll now receive timely smart prompts and budget alerts on this device.",
      });
      dispatchBrowserNotification("🔔 Budget Pilot Notifications Active", {
        body: "You're all set! We'll help you stay on top of your daily spending.",
      });
    } else {
      toast({
        title: "Permission Required",
        description: "Please allow notifications in your browser or device settings.",
        variant: "destructive",
      });
    }
    return granted;
  };

  const sendTestNotification = async () => {
    const settings = await db.settings.get('default');
    const currency = settings?.currency || '₹';
    const testId = `test-${Date.now()}`;

    const testNotif: AppNotification = {
      id: testId,
      type: 'routine_prompt',
      title: '⚡ Test Smart Prompt: Morning Coffee',
      message: `Habit detected: You usually spend ${currency}120 at 9:15 AM on Coffee. Tap to quick-log!`,
      isRead: false,
      category: 'food',
      actionType: 'add_expense',
      actionPayload: {
        items: 'Coffee',
        amount: 120,
        category: 'food',
        where: 'Cafe',
        paymentMethod: 'UPI',
        account: 'SBI',
      },
      createdAt: new Date().toISOString(),
    };

    await db.notifications.put(testNotif);

    if (isBrowserNotificationSupported() && getBrowserNotificationPermission() === 'granted') {
      dispatchBrowserNotification(testNotif.title, {
        body: testNotif.message,
        tag: testId,
      });
    }

    toast({
      title: "Test Notification Created",
      description: "Check the notification bell at the top to see the prompt in action!",
    });
  };

  const checkNow = async () => {
    const res = await runAllNotificationChecks();
    const total = res.prompts + res.alerts + res.reminders;
    if (total > 0) {
      toast({
        title: "New Alerts Generated",
        description: `Found ${total} timely update(s) and prompts.`,
      });
    } else {
      toast({
        title: "Up to Date",
        description: "No new prompts or budget alerts right now.",
      });
    }
    return res;
  };

  return {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestPermission,
    sendTestNotification,
    checkNow,
  };
}

import { useState, useMemo } from 'react';
import { 
  Bell, Zap, AlertTriangle, Repeat, ArrowRightLeft, Check, 
  Trash2, CheckCheck, RefreshCw, X, Sparkles, Plus, ChevronRight, Clock 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications, useNotificationActions } from '@/hooks/use-notifications';
import { AppNotification, NotificationType } from '@/lib/db';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getCategoryColor, findCategory } from '@/lib/categories';
import { getIconComponent } from '@/components/category-selector';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionClick?: (actionType: string, payload?: any) => void;
}

export function NotificationCenter({ open, onOpenChange, onActionClick }: NotificationCenterProps) {
  const { notifications, unreadCount } = useNotifications();
  const { markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, checkNow } = useNotificationActions();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'prompts' | 'alerts'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredNotifications = useMemo(() => {
    switch (filterTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'prompts':
        return notifications.filter(n => n.type === 'routine_prompt');
      case 'alerts':
        return notifications.filter(n => n.type === 'budget_alert' || n.type === 'due_reminder' || n.type === 'recurring_reminder');
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, filterTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkNow();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNotificationAction = async (notif: AppNotification) => {
    await markAsRead(notif.id);
    onOpenChange(false);
    if (onActionClick && notif.actionType) {
      onActionClick(notif.actionType, notif.actionPayload);
    }
  };

  const getTypeMeta = (type: NotificationType) => {
    switch (type) {
      case 'routine_prompt':
        return {
          icon: Zap,
          badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          label: 'Smart Prompt',
          accent: 'border-l-amber-500',
        };
      case 'budget_alert':
        return {
          icon: AlertTriangle,
          badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          label: 'Budget Alert',
          accent: 'border-l-rose-500',
        };
      case 'recurring_reminder':
        return {
          icon: Repeat,
          badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
          label: 'Recurring',
          accent: 'border-l-purple-500',
        };
      case 'due_reminder':
        return {
          icon: ArrowRightLeft,
          badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          label: 'Due Reminder',
          accent: 'border-l-blue-500',
        };
      default:
        return {
          icon: Bell,
          badgeBg: 'bg-muted text-muted-foreground border-border',
          label: 'Notice',
          accent: 'border-l-primary',
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[94vw] h-[520px] max-h-[82vh] flex flex-col p-0 overflow-hidden z-50 rounded-3xl border border-border shadow-2xl">
        {/* Static Header */}
        <div className="p-4 pr-12 sm:pr-4 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs font-bold rounded-full">
                    {unreadCount} new
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                Smart prompts, budget limits & dues alerts
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
              title="Check for new habit prompts & alerts"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-bold text-primary hover:bg-primary/10 gap-1 px-2 rounded-xl"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-1 px-3 py-2 bg-muted/40 border-b border-border text-xs overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-full font-bold text-xs transition-all ${
              filterTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1 rounded-full font-bold text-xs transition-all ${
              filterTab === 'unread'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('prompts')}
            className={`px-3 py-1 rounded-full font-bold text-xs transition-all flex items-center gap-1 ${
              filterTab === 'prompts'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Habits</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('alerts')}
            className={`px-3 py-1 rounded-full font-bold text-xs transition-all flex items-center gap-1 ${
              filterTab === 'alerts'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Alerts</span>
          </button>
        </div>

        {/* Static Height Scrollable Notifications List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 no-scrollbar pill-scroller">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">You're All Caught Up!</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                No notifications right now. Budget Pilot will automatically prompt you at your usual spending times and alert you if budgets are near limit.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const meta = getTypeMeta(notif.type);
              const Icon = meta.icon;
              let timeDistance = '';
              try {
                timeDistance = formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true });
              } catch {
                timeDistance = 'recently';
              }

              const categoryObj = notif.category ? findCategory(categories, notif.category) : undefined;
              const catColors = categoryObj ? getCategoryColor(categoryObj.color) : undefined;

              return (
                <div
                  key={notif.id}
                  className={`relative p-3 rounded-2xl border transition-all ${
                    meta.accent
                  } border-l-[3.5px] ${
                    !notif.isRead
                      ? 'bg-card shadow-xs border-border ring-1 ring-primary/25'
                      : 'bg-muted/30 border-border/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeBg}`}>
                        <Icon className="w-2.5 h-2.5" />
                        {meta.label}
                      </span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {timeDistance}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-rose-500 ml-1 rounded-lg"
                        onClick={() => deleteNotification(notif.id)}
                        title="Dismiss"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs text-foreground">{notif.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>

                  {/* Action Button if available */}
                  {notif.actionType && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {categoryObj && catColors && (
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${catColors.bg} ${catColors.text}`}>
                            {getIconComponent(categoryObj.icon, 'w-3 h-3')}
                            <span>{categoryObj.name}</span>
                          </div>
                        )}
                        {notif.actionPayload?.amount && (
                          <span className="text-xs font-black text-foreground">
                            ₹{notif.actionPayload.amount}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleNotificationAction(notif)}
                        className="h-7 px-3 text-xs font-bold gap-1 rounded-xl shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Log Expense</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2.5 px-4 border-t border-border bg-card flex items-center justify-between text-xs shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAllNotifications()}
              className="h-7 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
            >
              Clear all
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {notifications.length} total prompts
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

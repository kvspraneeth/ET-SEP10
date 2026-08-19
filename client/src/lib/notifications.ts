import db, { AppNotification, NotificationType, DebtRecord, RecurringExpense } from './db';
import { Expense, Budget } from '@shared/schema';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday } from 'date-fns';

// Routine habit cluster representation
export interface HabitPattern {
  key: string;
  items: string;
  category: string;
  avgAmount: number;
  typicalHour: number;
  typicalMinute: number;
  timeWindowLabel: string; // e.g. "Morning", "Lunch", "Evening", "Night"
  dayPattern: 'weekday' | 'weekend' | 'daily' | 'specific_day';
  targetDayOfWeek?: number;
  frequencyCount: number;
  lastUsedDate: string;
  where?: string;
  paymentMethod?: string;
  account?: string;
}

/**
 * Check if the browser supports Notification API and if permission is granted
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    const isGranted = permission === 'granted';
    await db.settings.update('default', { browserNotificationsEnabled: isGranted });
    return isGranted;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Checks whether the current time falls inside the user's defined Quiet Hours
 */
export function isQuietHours(startStr = '22:00', endStr = '07:00'): boolean {
  try {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startMins = (startH || 22) * 60 + (startM || 0);
    const endMins = (endH || 7) * 60 + (endM || 0);

    if (startMins > endMins) {
      // Overnight quiet hours, e.g. 22:00 to 07:00
      return currentMins >= startMins || currentMins < endMins;
    } else {
      return currentMins >= startMins && currentMins < endMins;
    }
  } catch {
    return false;
  }
}

/**
 * Dispatch an operating-system / mobile-device browser notification
 * Uses ServiceWorkerRegistration.showNotification() for Android Chrome/PWAs with desktop fallback
 */
export async function dispatchBrowserNotification(title: string, options?: NotificationOptions) {
  if (!isBrowserNotificationSupported()) {
    return;
  }

  try {
    const isGranted = Notification.permission === 'granted';
    if (!isGranted) return;

    const notificationPayload: any = {
      icon: '/icons/v3_maskable_512.png',
      badge: '/icons/v3_maskable_512.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: options?.tag || `pocket-ledger-${Date.now()}`,
      renotify: true,
      data: {
        url: '/',
        ...((options as any)?.data || {}),
      },
      ...options,
    };

    // 1. Try ServiceWorker registration first (Essential for mobile Chrome and PWAs)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, notificationPayload);
          return;
        }
      } catch (swErr) {
        console.warn('ServiceWorker showNotification failed, trying standard Notification constructor:', swErr);
      }
    }

    // 2. Fallback to standard Notification constructor (for desktop browsers)
    const notif = new Notification(title, notificationPayload);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.warn('Native notification dispatch failed:', err);
  }
}

/**
 * Analyzes historical transactions to discover repeating daily/weekly routines
 */
export function analyzeUserSpendingHabits(pastExpenses: Expense[]): HabitPattern[] {
  if (!pastExpenses || pastExpenses.length < 3) return [];

  // Group by normalized title + category
  const clusters: Record<string, {
    items: string;
    category: string;
    amounts: number[];
    times: { hour: number; minute: number; dayOfWeek: number; date: string }[];
    locations: string[];
    methods: string[];
    accounts: string[];
  }> = {};

  pastExpenses.forEach(exp => {
    const title = (exp.items || '').trim();
    if (!title && !exp.category) return;
    const key = `${(title || exp.category).toLowerCase()}::${(exp.category || '').toLowerCase()}`;

    if (!clusters[key]) {
      clusters[key] = {
        items: title || exp.category,
        category: exp.category,
        amounts: [],
        times: [],
        locations: [],
        methods: [],
        accounts: [],
      };
    }

    if (exp.amount) clusters[key].amounts.push(Number(exp.amount));
    if (exp.where) clusters[key].locations.push(exp.where);
    if (exp.paymentMethod) clusters[key].methods.push(exp.paymentMethod);
    if (exp.account) clusters[key].accounts.push(exp.account);

    if (exp.date && exp.time) {
      try {
        const d = parseISO(exp.date);
        const [h, m] = exp.time.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          clusters[key].times.push({
            hour: h,
            minute: m,
            dayOfWeek: d.getDay(), // 0 = Sunday, 1 = Monday, etc.
            date: exp.date,
          });
        }
      } catch {
        // ignore malformed date
      }
    }
  });

  const habits: HabitPattern[] = [];

  Object.entries(clusters).forEach(([key, cluster]) => {
    // Only analyze clusters with at least 2 entries
    if (cluster.times.length < 2) return;

    // Calculate median/average hour and minute
    const totalMinutes = cluster.times.reduce((sum, t) => sum + (t.hour * 60 + t.minute), 0);
    const avgMinutes = Math.round(totalMinutes / cluster.times.length);
    const typicalHour = Math.floor(avgMinutes / 60);
    const typicalMinute = avgMinutes % 60;

    const avgAmount = cluster.amounts.length > 0
      ? cluster.amounts.reduce((sum, a) => sum + a, 0) / cluster.amounts.length
      : 0;

    // Determine Day Pattern
    const days = cluster.times.map(t => t.dayOfWeek);
    const weekdayCount = days.filter(d => d >= 1 && d <= 5).length;
    const weekendCount = days.filter(d => d === 0 || d === 6).length;

    let dayPattern: 'weekday' | 'weekend' | 'daily' | 'specific_day' = 'daily';
    let targetDayOfWeek: number | undefined;

    if (weekdayCount >= cluster.times.length * 0.75) {
      dayPattern = 'weekday';
    } else if (weekendCount >= cluster.times.length * 0.75) {
      dayPattern = 'weekend';
    } else {
      // Check if strongly correlated with a specific day
      const dayFrequencies: Record<number, number> = {};
      days.forEach(d => { dayFrequencies[d] = (dayFrequencies[d] || 0) + 1; });
      const mostFrequentDay = Object.entries(dayFrequencies).sort((a, b) => b[1] - a[1])[0];
      if (mostFrequentDay && Number(mostFrequentDay[1]) >= cluster.times.length * 0.6) {
        dayPattern = 'specific_day';
        targetDayOfWeek = Number(mostFrequentDay[0]);
      }
    }

    // Determine Time Window label
    let timeWindowLabel = 'Morning';
    if (typicalHour >= 12 && typicalHour < 16) timeWindowLabel = 'Lunch';
    else if (typicalHour >= 16 && typicalHour < 20) timeWindowLabel = 'Evening';
    else if (typicalHour >= 20 || typicalHour < 5) timeWindowLabel = 'Night';

    // Find most common location, method, account
    const getTop = (arr: string[]) => {
      if (arr.length === 0) return undefined;
      const countMap: Record<string, number> = {};
      arr.forEach(item => { if (item) countMap[item] = (countMap[item] || 0) + 1; });
      return Object.entries(countMap).sort((a, b) => b[1] - a[1])[0]?.[0];
    };

    // Sort times by date desc to get last date
    const sortedDates = cluster.times.map(t => t.date).sort().reverse();

    habits.push({
      key,
      items: cluster.items,
      category: cluster.category,
      avgAmount: Math.round(avgAmount),
      typicalHour,
      typicalMinute,
      timeWindowLabel,
      dayPattern,
      targetDayOfWeek,
      frequencyCount: cluster.times.length,
      lastUsedDate: sortedDates[0] || '',
      where: getTop(cluster.locations),
      paymentMethod: getTop(cluster.methods) || 'UPI',
      account: getTop(cluster.accounts) || 'SBI',
    });
  });

  return habits;
}

/**
 * Checks for habit-based spending prompts and creates notifications
 */
export async function checkRoutineHabitPrompts(): Promise<number> {
  const settings = await db.settings.get('default');
  if (settings && settings.notifications === false) return 0;
  if (settings && settings.notifyRoutinePrompts === false) return 0;

  if (settings?.quietHoursEnabled && isQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
    return 0;
  }

  const pastExpenses = await db.expenses.toArray();
  const habits = analyzeUserSpendingHabits(pastExpenses);
  if (habits.length === 0) return 0;

  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMinute;
  const todayDateStr = format(now, 'yyyy-MM-dd');
  const currency = settings?.currency || '₹';

  // Check which expenses user already logged TODAY
  const todaysExpenses = pastExpenses.filter(e => e.date === todayDateStr);
  const existingNotifs = await db.notifications.toArray();

  let createdCount = 0;

  for (const habit of habits) {
    // 1. Day of week match check
    if (habit.dayPattern === 'weekday' && (currentDayOfWeek === 0 || currentDayOfWeek === 6)) {
      continue;
    }
    if (habit.dayPattern === 'weekend' && currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
      continue;
    }
    if (habit.dayPattern === 'specific_day' && habit.targetDayOfWeek !== undefined && habit.targetDayOfWeek !== currentDayOfWeek) {
      continue;
    }

    // 2. Timing match check: within ±50 minutes of typical spending time
    const habitMins = habit.typicalHour * 60 + habit.typicalMinute;
    const diffMins = Math.abs(currentTotalMins - habitMins);
    if (diffMins > 50) {
      continue;
    }

    // 3. Has user already logged this expense today?
    const alreadyLoggedToday = todaysExpenses.some(e => {
      const matchTitle = (e.items || '').trim().toLowerCase() === habit.items.toLowerCase();
      const matchCat = e.category === habit.category;
      return matchTitle || matchCat;
    });
    if (alreadyLoggedToday) continue;

    // 4. Have we already prompted for this habit today?
    const alreadyPromptedToday = existingNotifs.some(n => {
      if (n.type !== 'routine_prompt') return false;
      const notifDate = (n.createdAt || '').split('T')[0];
      return notifDate === todayDateStr && n.metadata?.habitKey === habit.key;
    });
    if (alreadyPromptedToday) continue;

    // Format typical time string e.g. "9:15 AM"
    const timeFormatted = format(new Date(2026, 0, 1, habit.typicalHour, habit.typicalMinute), 'h:mm a');

    // Create Notification
    const notifId = `prompt-${habit.key}-${todayDateStr}-${habit.typicalHour}`;
    const newNotif: AppNotification = {
      id: notifId,
      type: 'routine_prompt',
      title: `⚡ Usual ${habit.items || habit.category} time?`,
      message: `You usually spend around ${currency}${habit.avgAmount} on ${habit.items} around ${timeFormatted}. Tap to log in 1 click!`,
      isRead: false,
      category: habit.category,
      actionType: 'add_expense',
      actionPayload: {
        items: habit.items,
        amount: habit.avgAmount,
        category: habit.category,
        where: habit.where || '',
        paymentMethod: habit.paymentMethod || 'UPI',
        account: habit.account || 'SBI',
      },
      metadata: {
        habitKey: habit.key,
        triggerDate: todayDateStr,
      },
      createdAt: new Date().toISOString(),
    };

    await db.notifications.put(newNotif);
    createdCount++;

    // Fire browser push if enabled
    if (settings?.browserNotificationsEnabled) {
      dispatchBrowserNotification(newNotif.title, {
        body: newNotif.message,
        tag: notifId,
      });
    }
  }

  return createdCount;
}

/**
 * Checks budget consumption and triggers threshold / overbudget warnings
 */
export async function checkBudgetAlerts(): Promise<number> {
  const settings = await db.settings.get('default');
  if (settings && settings.notifications === false) return 0;
  if (settings && settings.notifyBudgetAlerts === false) return 0;

  const thresholdPercent = settings?.notifyBudgetThreshold || 80;
  const budgets = await db.budgets.toArray();
  const pastExpenses = await db.expenses.toArray();
  const existingNotifs = await db.notifications.toArray();
  const currency = settings?.currency || '₹';

  const now = new Date();
  const todayDateStr = format(now, 'yyyy-MM-dd');
  let createdCount = 0;

  for (const budget of budgets) {
    if (budget.isActive === false || Number(budget.amount) <= 0) continue;

    let periodStart: Date;
    let periodEnd: Date;
    switch (budget.period) {
      case 'weekly':
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'yearly':
        periodStart = startOfMonth(new Date(now.getFullYear(), 0, 1));
        periodEnd = endOfMonth(new Date(now.getFullYear(), 11, 31));
        break;
      case 'monthly':
      default:
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
        break;
    }

    const spent = pastExpenses
      .filter(exp => {
        if (!exp.date) return false;
        const matchCat = budget.category === 'ALL' || exp.category === budget.category;
        if (!matchCat) return false;
        try {
          const d = parseISO(exp.date);
          return d >= periodStart && d <= periodEnd;
        } catch {
          return false;
        }
      })
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    const budgetLimit = Number(budget.amount);
    const usagePercent = (spent / budgetLimit) * 100;

    if (usagePercent >= thresholdPercent) {
      const isOver = usagePercent >= 100;
      const notifLevel = isOver ? 'overbudget' : 'threshold';
      const periodKey = format(periodStart, 'yyyy-MM-dd');
      const notifId = `budget-${budget.id}-${periodKey}-${notifLevel}`;

      // Check if already notified for this budget in this period
      const alreadyNotified = existingNotifs.some(n => n.id === notifId);
      if (!alreadyNotified) {
        const title = isOver
          ? `🚨 Budget Exceeded: ${budget.name}`
          : `⚠️ Budget Alert: ${budget.name} (${Math.round(usagePercent)}% Used)`;

        const message = isOver
          ? `You've spent ${currency}${spent.toLocaleString()} which is ${currency}${(spent - budgetLimit).toLocaleString()} over your ${budget.period} budget of ${currency}${budgetLimit.toLocaleString()}.`
          : `You've reached ${Math.round(usagePercent)}% (${currency}${spent.toLocaleString()} of ${currency}${budgetLimit.toLocaleString()}) of your ${budget.period} budget.`;

        const newNotif: AppNotification = {
          id: notifId,
          type: 'budget_alert',
          title,
          message,
          isRead: false,
          category: budget.category,
          actionType: 'view_budget',
          metadata: {
            budgetId: budget.id,
            triggerDate: todayDateStr,
          },
          createdAt: new Date().toISOString(),
        };

        await db.notifications.put(newNotif);
        createdCount++;

        if (settings?.browserNotificationsEnabled && !(settings?.quietHoursEnabled && isQuietHours(settings.quietHoursStart, settings.quietHoursEnd))) {
          dispatchBrowserNotification(title, {
            body: message,
            tag: notifId,
          });
        }
      }
    }
  }

  return createdCount;
}

/**
 * Checks for upcoming recurring expenses and debts due today
 */
export async function checkRecurringAndDueReminders(): Promise<number> {
  const settings = await db.settings.get('default');
  if (settings && settings.notifications === false) return 0;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currency = settings?.currency || '₹';
  const existingNotifs = await db.notifications.toArray();
  let createdCount = 0;

  // 1. Recurring Expenses Reminders
  if (settings?.notifyRecurringReminders !== false) {
    const recurringExpenses = await db.recurringExpenses.toArray();
    for (const rule of recurringExpenses) {
      if (rule.isActive === false) continue;
      // If start date matches or next date is today
      if (rule.startDate === todayStr || rule.lastGeneratedDate === todayStr) {
        const notifId = `recurring-${rule.id}-${todayStr}`;
        if (!existingNotifs.some(n => n.id === notifId)) {
          const newNotif: AppNotification = {
            id: notifId,
            type: 'recurring_reminder',
            title: `🔁 Recurring Payment: ${rule.items || rule.category}`,
            message: `Scheduled recurring expense of ${currency}${rule.amount} is active for today (${rule.frequency}).`,
            isRead: false,
            category: rule.category,
            actionType: 'view_charts',
            metadata: {
              ruleId: rule.id,
              triggerDate: todayStr,
            },
            createdAt: new Date().toISOString(),
          };
          await db.notifications.put(newNotif);
          createdCount++;
        }
      }
    }
  }

  // 2. Pending Dues Reminders
  if (settings?.notifyDueReminders !== false) {
    const debts = await db.debts.toArray();
    const pendingDues = debts.filter(d => d.status === 'pending');
    for (const debt of pendingDues) {
      const debtDateStr = (debt.datetime || debt.createdAt || '').split('T')[0];
      if (debtDateStr && debtDateStr <= todayStr) {
        const notifId = `debt-${debt.id}-${todayStr}`;
        if (!existingNotifs.some(n => n.id === notifId)) {
          const isDue = debt.type === 'due';
          const title = isDue ? `🤝 Payment Due to ${debt.personName}` : `💰 Receivable Pending from ${debt.personName}`;
          const message = `${currency}${debt.amount} for "${debt.purpose}" is pending settlement.`;
          const newNotif: AppNotification = {
            id: notifId,
            type: 'due_reminder',
            title,
            message,
            isRead: false,
            actionType: 'view_dues',
            metadata: {
              debtId: debt.id,
              triggerDate: todayStr,
            },
            createdAt: new Date().toISOString(),
          };
          await db.notifications.put(newNotif);
          createdCount++;
        }
      }
    }
  }

  return createdCount;
}

/**
 * Main orchestrator: runs habit prompts, budget alerts, and reminder checks
 */
export async function runAllNotificationChecks(): Promise<{ prompts: number; alerts: number; reminders: number }> {
  try {
    const prompts = await checkRoutineHabitPrompts();
    const alerts = await checkBudgetAlerts();
    const reminders = await checkRecurringAndDueReminders();
    return { prompts, alerts, reminders };
  } catch (err) {
    console.error('Error running notification checks:', err);
    return { prompts: 0, alerts: 0, reminders: 0 };
  }
}

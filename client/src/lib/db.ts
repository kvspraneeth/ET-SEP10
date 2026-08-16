import Dexie, { Table } from 'dexie';
import { Expense, Category, Budget, categories, budgets, settings } from '@shared/schema';
import { DEFAULT_CATEGORIES } from './categories';

export interface Setting {
  id: string;
  currency: string;
  theme: string;
  language: string;
  notifications: boolean;
  budgetAlerts: boolean;
  // Granular Notification Settings
  notifyRoutinePrompts?: boolean;
  notifyHabitPrompts?: boolean;
  notifyBudgetAlerts?: boolean;
  notifyBudgetThreshold?: number; // e.g., 80 for 80%
  notifyRecurringReminders?: boolean;
  notifyDueReminders?: boolean;
  browserNotificationsEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string; // e.g. "22:00"
  quietHoursEnd?: string; // e.g. "07:00"
  // UI & Custom Theming
  primaryColor?: string; // e.g. "violet" | "emerald" | "blue" | "amber" | "rose" | "teal" | "indigo" | "gold"
  customGradient?: string;
  fontFamily?: string; // e.g. "jakarta" | "outfit" | "inter" | "manrope" | "sora"
}

// Define the Debt interface for TypeScript
export interface DebtRecord {
  id?: number; // Optional because Dexie auto-increments it
  type: 'due' | 'receivable';
  amount: number;
  purpose: string;
  location?: string;
  personName: string;
  notes?: string;
  datetime: string;
  status: 'pending' | 'settled';
  recurringRuleId?: string;
  createdAt: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type CustomIntervalUnit = 'days' | 'weeks' | 'months' | 'years';

export interface RecurringExpense {
  id: string;
  amount: number;
  items: string;
  category: string;
  where?: string;
  note?: string;
  paymentMethod: string;
  account: string;
  startDate: string; // yyyy-MM-dd
  endDate?: string;  // yyyy-MM-dd
  frequency: RecurrenceFrequency;
  customIntervalCount?: number;
  customIntervalUnit?: CustomIntervalUnit;
  isActive: boolean;
  lastGeneratedDate?: string; // yyyy-MM-dd
  createdAt: string;
  updatedAt: string;
}

export interface RecurringDebt {
  id: string;
  type: 'due' | 'receivable';
  amount: number;
  purpose: string;
  personName: string;
  location?: string;
  notes?: string;
  startDate: string; // yyyy-MM-dd
  endDate?: string;  // yyyy-MM-dd
  frequency: RecurrenceFrequency;
  customIntervalCount?: number;
  customIntervalUnit?: CustomIntervalUnit;
  isActive: boolean;
  lastGeneratedDate?: string; // yyyy-MM-dd
  createdAt: string;
  updatedAt: string;
}

// Custom Chart definition for User-Defined Custom Charts
export type ChartType = 'donut' | 'pie' | 'vertical-bar' | 'horizontal-bar' | 'stacked-bar' | 'area' | 'line' | 'radar';
export type ChartMetric = 'total' | 'count' | 'average' | 'max';
export type ChartGroupBy = 'category' | 'account' | 'paymentMethod' | 'dayOfWeek' | 'timeOfDay' | 'month' | 'isRecurring';
export type ChartDateRange = 'today' | 'last7days' | 'thisMonth' | 'lastMonth' | 'last30days' | 'last90days' | 'thisYear' | 'all' | 'custom';

export interface CustomChart {
  id: string;
  title: string;
  description?: string;
  chartType: ChartType;
  metric: ChartMetric;
  groupBy: ChartGroupBy;
  dateRangeType: ChartDateRange;
  customFrom?: string; // yyyy-MM-dd
  customTo?: string;   // yyyy-MM-dd
  selectedCategories?: string[]; // category IDs or empty for all
  selectedAccounts?: string[];   // account names or empty for all
  selectedPaymentMethods?: string[]; // payment methods or empty for all
  orderIndex?: number;
  createdAt: string;
  updatedAt: string;
}

// App Notification definition
export type NotificationType = 'routine_prompt' | 'budget_alert' | 'recurring_reminder' | 'due_reminder' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  category?: string;
  actionType?: 'add_expense' | 'view_budget' | 'view_dues' | 'view_charts' | 'dismiss';
  actionPayload?: any; // e.g. { items, category, amount, where, paymentMethod, account }
  metadata?: {
    budgetId?: string;
    ruleId?: string;
    debtId?: number;
    habitKey?: string;
    triggerDate?: string;
  };
  createdAt: string; // ISO string
  expiresAt?: string; // ISO string
}

export interface AppDB extends Dexie {
  expenses: Table<Expense>;
  categories: Table<Category>;
  budgets: Table<Budget>;
  settings: Table<Setting>;
  debts: Table<DebtRecord>;
  recurringExpenses: Table<RecurringExpense>;
  recurringDebts: Table<RecurringDebt>;
  customCharts: Table<CustomChart>;
  notifications: Table<AppNotification>;
}

export const db = new Dexie('ExpenseTrackerDB') as AppDB;

// Keep Version 1 for backwards compatibility with existing phone installs
db.version(1).stores({
  expenses: '++id, amount, date, category, paymentMethod, account, createdAt',
  categories: '++id, name, isDefault',
  budgets: '++id, category, period, isActive',
  settings: '++id',
});

// Version 2: Adds the debts table
db.version(2).stores({
  expenses: '++id, amount, date, category, paymentMethod, account, createdAt',
  categories: '++id, name, isDefault',
  budgets: '++id, category, period, isActive',
  settings: '++id',
  debts: '++id, type, personName, status, datetime, createdAt',
});

// Version 3: Adds Recurring Expenses and Recurring Debts
db.version(3).stores({
  expenses: '++id, amount, date, category, paymentMethod, account, recurringRuleId, createdAt',
  categories: '++id, name, isDefault',
  budgets: '++id, category, period, isActive',
  settings: '++id',
  debts: '++id, type, personName, status, datetime, recurringRuleId, createdAt',
  recurringExpenses: 'id, items, category, frequency, isActive, startDate, createdAt',
  recurringDebts: 'id, type, personName, frequency, isActive, startDate, createdAt',
});

// Version 4: Adds Custom Charts and Notifications tables
db.version(4).stores({
  expenses: '++id, amount, date, category, paymentMethod, account, recurringRuleId, createdAt',
  categories: '++id, name, isDefault',
  budgets: '++id, category, period, isActive',
  settings: '++id',
  debts: '++id, type, personName, status, datetime, recurringRuleId, createdAt',
  recurringExpenses: 'id, items, category, frequency, isActive, startDate, createdAt',
  recurringDebts: 'id, type, personName, frequency, isActive, startDate, createdAt',
  customCharts: 'id, title, chartType, metric, groupBy, dateRangeType, createdAt',
  notifications: 'id, type, isRead, createdAt',
});

// Initialize default data
db.on('ready', async () => {
  // Check if we have categories
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }

  // Check if we have settings
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      id: 'default',
      currency: '₹',
      theme: 'light',
      language: 'en',
      notifications: true,
      budgetAlerts: true,
      notifyRoutinePrompts: true,
      notifyBudgetAlerts: true,
      notifyBudgetThreshold: 80,
      notifyRecurringReminders: true,
      notifyDueReminders: true,
      browserNotificationsEnabled: false,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });
  } else {
    // Migrate default setting fields if missing
    const existing = await db.settings.get('default');
    if (existing && existing.notifyRoutinePrompts === undefined) {
      await db.settings.update('default', {
        notifyRoutinePrompts: true,
        notifyBudgetAlerts: true,
        notifyBudgetThreshold: 80,
        notifyRecurringReminders: true,
        notifyDueReminders: true,
        browserNotificationsEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });
    }
  }

  // Seed initial sample custom charts if none exist
  const customChartsCount = await db.customCharts.count();
  if (customChartsCount === 0) {
    const nowIso = new Date().toISOString();
    await db.customCharts.bulkAdd([
      {
        id: 'default-category-donut',
        title: 'Monthly Category Breakdown',
        description: 'Visual breakdown of monthly expenses by category',
        chartType: 'donut',
        metric: 'total',
        groupBy: 'category',
        dateRangeType: 'thisMonth',
        orderIndex: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'default-payment-bar',
        title: 'Payment Method Distribution',
        description: 'Compare spending across UPI, Cards, Cash & Netbanking',
        chartType: 'vertical-bar',
        metric: 'total',
        groupBy: 'paymentMethod',
        dateRangeType: 'thisMonth',
        orderIndex: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'default-weekly-pattern',
        title: 'Day of Week Spending Heat',
        description: 'Track which days of the week you spend the most',
        chartType: 'vertical-bar',
        metric: 'total',
        groupBy: 'dayOfWeek',
        dateRangeType: 'last30days',
        orderIndex: 2,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    ]);
  }
});

export default db;

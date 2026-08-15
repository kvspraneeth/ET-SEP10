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

export interface AppDB extends Dexie {
  expenses: Table<Expense>;
  categories: Table<Category>;
  budgets: Table<Budget>;
  settings: Table<Setting>;
  debts: Table<DebtRecord>;
  recurringExpenses: Table<RecurringExpense>;
  recurringDebts: Table<RecurringDebt>;
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
    });
  }
});

export default db;

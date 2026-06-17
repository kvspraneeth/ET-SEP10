import Dexie, { Table } from 'dexie';
import { Expense, categories, budgets, settings } from '@shared/schema';
import { DEFAULT_CATEGORIES } from './categories';

interface Setting {
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
  createdAt: string;
}


export interface AppDB extends Dexie {
  expenses: Table<Expense>;
  categories: Table<typeof categories>;
  budgets: Table<typeof budgets>;
  settings: Table<Setting>;
  debts: Table<DebtRecord>; // NEW: Added Debts table
}

export const db = new Dexie('ExpenseTrackerDB') as AppDB;

// Keep Version 1 for backwards compatibility with existing phone installs
db.version(1).stores({
  expenses: '++id, amount, date, category, paymentMethod, account, createdAt',
  categories: '++id, name, isDefault',
  budgets: '++id, category, period, isActive',
  settings: '++id',
});

// Version 2: Adds the new debts table seamlessly
db.version(2).stores({
  expenses: '++id, amount, date, category, paymentMethod, account, createdAt',
  categories: '++id, name, isDefault',
  budgets: '++id, category, period, isActive',
  settings: '++id',
  debts: '++id, type, personName, status, datetime, createdAt', // NEW: Indexed columns for filtering
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


import Dexie, { Table } from 'dexie';
import { Expense, Category, Budget, Settings } from '@shared/schema';

export interface AppDB extends Dexie {
  expenses: Table<Expense>;
  categories: Table<Category>;
  budgets: Table<Budget>;
  settings: Table<Settings>;
}

export const db = new Dexie('ExpenseTrackerDB') as AppDB;

db.version(1).stores({
  expenses: '++id, amount, date, category, paymentMethod, account, createdAt',
  categories: '++id, name, isDefault',
  budgets: '++id, category, period, isActive',
  settings: '++id',
});

// Initialize default data
db.on('ready', async () => {
  // Check if we have categories
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd([
      { id: 'groceries', name: 'Groceries', icon: '🛒', color: 'green', isDefault: true },
      { id: 'food', name: 'Food', icon: '🍽️', color: 'purple', isDefault: true },
      { id: 'transport', name: 'Transport', icon: '⛽', color: 'blue', isDefault: true },
      { id: 'bills', name: 'Bills', icon: '📄', color: 'red', isDefault: true },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: 'orange', isDefault: true },
      { id: 'healthcare', name: 'Healthcare', icon: '❤️', color: 'cyan', isDefault: true },
      { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'pink', isDefault: true },
    ]);
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

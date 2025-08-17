import { Category } from '@shared/schema';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', icon: 'shopping-cart', color: 'green', isDefault: true },
  { id: 'food', name: 'Food', icon: 'utensils', color: 'purple', isDefault: true },
  { id: 'transport', name: 'Transport', icon: 'car', color: 'blue', isDefault: true },
  { id: 'bills', name: 'Bills', icon: 'file-text', color: 'red', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: 'tv', color: 'orange', isDefault: true },
  { id: 'healthcare', name: 'Healthcare', icon: 'heart', color: 'cyan', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: 'pink', isDefault: true },
];

export const getCategoryColor = (color: string) => {
  const colors = {
    green: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
    red: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-700 dark:text-cyan-300' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-700 dark:text-pink-300' },
    gray: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  };
  return colors[color as keyof typeof colors] || colors.gray;
};

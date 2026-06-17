//import { Category } from '@shared/schema';
import type { Category } from '@shared/schema';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', userId: 'local', name: 'Groceries', icon: 'shopping-cart', color: 'green', isDefault: true, updatedAt: new Date() },
  { id: 'food', userId: 'local', name: 'Food', icon: 'utensils', color: 'purple', isDefault: true, updatedAt: new Date() },
  { id: 'transport', userId: 'local', name: 'Transport', icon: 'car', color: 'blue', isDefault: true, updatedAt: new Date() },
  { id: 'bills', userId: 'local', name: 'Bills', icon: 'file-text', color: 'red', isDefault: true, updatedAt: new Date() },
  { id: 'entertainment', userId: 'local', name: 'Entertainment', icon: 'tv', color: 'orange', isDefault: true, updatedAt: new Date() },
  { id: 'healthcare', userId: 'local', name: 'Healthcare', icon: 'heart', color: 'cyan', isDefault: true, updatedAt: new Date() },
  { id: 'shopping', userId: 'local', name: 'Shopping', icon: 'shopping-bag', color: 'pink', isDefault: true, updatedAt: new Date() },
  { id: 'travel', userId: 'local', name: 'Travel', icon: 'plane', color: 'indigo', isDefault: true, updatedAt: new Date() },
  { id: 'investing', userId: 'local', name: 'Investing', icon: 'trending-up', color: 'green', isDefault: true, updatedAt: new Date() },
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
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-700 dark:text-indigo-300' },
    gray: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  };
  return colors[color as keyof typeof colors] || colors.gray;
};

// Intelligently guess the best icon and color based on the category name
export const guessCategoryProperties = (name: string) => {
  const n = name.toLowerCase();
  
  if (n.includes('food') || n.includes('eat') || n.includes('dine') || n.includes('meal') || n.includes('restaurant')) return { icon: 'utensils', color: 'purple' };
  if (n.includes('travel') || n.includes('flight') || n.includes('trip') || n.includes('hotel') || n.includes('vacation')) return { icon: 'plane', color: 'indigo' };
  if (n.includes('bill') || n.includes('utilit') || n.includes('water') || n.includes('electric') || n.includes('internet') || n.includes('phone') || n.includes('subscrip')) return { icon: 'file-text', color: 'red' };
  if (n.includes('health') || n.includes('medic') || n.includes('doctor') || n.includes('pharmacy') || n.includes('gym') || n.includes('fitness')) return { icon: 'heart', color: 'cyan' };
  if (n.includes('shop') || n.includes('cloth') || n.includes('amazon') || n.includes('gift')) return { icon: 'shopping-bag', color: 'pink' };
  if (n.includes('car') || n.includes('gas') || n.includes('transport') || n.includes('transit') || n.includes('taxi') || n.includes('uber')) return { icon: 'car', color: 'blue' };
  if (n.includes('entertain') || n.includes('movie') || n.includes('game') || n.includes('fun') || n.includes('party')) return { icon: 'tv', color: 'orange' };
  if (n.includes('invest') || n.includes('stock') || n.includes('crypto') || n.includes('save') || n.includes('bank')) return { icon: 'trending-up', color: 'green' };
  if (n.includes('grocer') || n.includes('market') || n.includes('supermarket')) return { icon: 'shopping-cart', color: 'green' };

  return { icon: 'tag', color: 'gray' }; // Default fallback
};
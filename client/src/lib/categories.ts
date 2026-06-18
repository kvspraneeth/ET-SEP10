import type { Category } from '@shared/schema';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'groceries',
    userId: 'local',
    name: 'Groceries',
    icon: 'shopping-cart',
    color: 'green',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'food',
    userId: 'local',
    name: 'Food',
    icon: 'utensils',
    color: 'purple',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'transport',
    userId: 'local',
    name: 'Transport',
    icon: 'car',
    color: 'blue',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'bills',
    userId: 'local',
    name: 'Bills',
    icon: 'file-text',
    color: 'red',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'entertainment',
    userId: 'local',
    name: 'Entertainment',
    icon: 'tv',
    color: 'orange',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'healthcare',
    userId: 'local',
    name: 'Healthcare',
    icon: 'heart',
    color: 'cyan',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'shopping',
    userId: 'local',
    name: 'Shopping',
    icon: 'shopping-bag',
    color: 'pink',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'travel',
    userId: 'local',
    name: 'Travel',
    icon: 'plane',
    color: 'indigo',
    isDefault: true,
    updatedAt: new Date(),
  },
  {
    id: 'investing',
    userId: 'local',
    name: 'Investing',
    icon: 'trending-up',
    color: 'green',
    isDefault: true,
    updatedAt: new Date(),
  },
];

export const getCategoryColor = (color: string) => {
  const colors = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
    },
    cyan: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-700 dark:text-cyan-300',
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      text: 'text-pink-700 dark:text-pink-300',
    },
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
    },
  };

  return colors[color as keyof typeof colors] || colors.gray;
};

export const guessCategoryProperties = (name: string) => {
  const n = name.toLowerCase().trim();

  // Food
  if (
    n.includes('food') ||
    n.includes('eat') ||
    n.includes('meal') ||
    n.includes('restaurant') ||
    n.includes('cafe')
  ) {
    return { icon: 'utensils', color: 'purple' };
  }

  // Travel
  if (
    n.includes('travel') ||
    n.includes('trip') ||
    n.includes('flight') ||
    n.includes('vacation') ||
    n.includes('hotel')
  ) {
    return { icon: 'plane', color: 'indigo' };
  }

  // Bills
  if (
    n.includes('bill') ||
    n.includes('utility') ||
    n.includes('electric') ||
    n.includes('water') ||
    n.includes('internet') ||
    n.includes('subscription') ||
    n.includes('netflix')
  ) {
    return { icon: 'file-text', color: 'red' };
  }

  // Health
  if (
    n.includes('health') ||
    n.includes('doctor') ||
    n.includes('medical') ||
    n.includes('pharmacy') ||
    n.includes('fitness') ||
    n.includes('gym')
  ) {
    return { icon: 'heart', color: 'cyan' };
  }

  // Shopping
  if (
    n.includes('shop') ||
    n.includes('amazon') ||
    n.includes('clothes') ||
    n.includes('gift')
  ) {
    return { icon: 'shopping-bag', color: 'pink' };
  }

  // Transport
  if (
    n.includes('transport') ||
    n.includes('car') ||
    n.includes('fuel') ||
    n.includes('petrol') ||
    n.includes('diesel') ||
    n.includes('taxi') ||
    n.includes('uber')
  ) {
    return { icon: 'car', color: 'blue' };
  }

  // Entertainment
  if (
    n.includes('movie') ||
    n.includes('game') ||
    n.includes('party') ||
    n.includes('entertainment')
  ) {
    return { icon: 'tv', color: 'orange' };
  }

  // Investing
  if (
    n.includes('invest') ||
    n.includes('stock') ||
    n.includes('crypto') ||
    n.includes('mutual fund') ||
    n.includes('sip')
  ) {
    return { icon: 'trending-up', color: 'green' };
  }

  // Groceries
  if (
    n.includes('grocery') ||
    n.includes('groceries') ||
    n.includes('market') ||
    n.includes('supermarket')
  ) {
    return { icon: 'shopping-cart', color: 'green' };
  }

  // Income
  if (
    n.includes('salary') ||
    n.includes('income') ||
    n.includes('bonus') ||
    n.includes('freelance')
  ) {
    return { icon: 'wallet', color: 'green' };
  }

  return {
    icon: 'tag',
    color: 'gray',
  };
};
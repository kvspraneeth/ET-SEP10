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

export const ICON_AND_EMOJI_TO_CATEGORY: Record<string, string> = {
  // Lucide icon names
  'shopping-cart': 'groceries',
  'utensils': 'food',
  'car': 'transport',
  'file-text': 'bills',
  'tv': 'entertainment',
  'heart': 'healthcare',
  'shopping-bag': 'shopping',
  'plane': 'travel',
  'trending-up': 'investing',
  'tag': 'groceries',
  'wallet': 'bills',

  // Common emojis
  '🛒': 'groceries',
  '🍽️': 'food',
  '🍽': 'food',
  '🍕': 'food',
  '🍔': 'food',
  '🚗': 'transport',
  '⛽': 'transport',
  '📄': 'bills',
  '📑': 'bills',
  '🎬': 'entertainment',
  '🎥': 'entertainment',
  '📺': 'entertainment',
  '❤️': 'healthcare',
  '🩺': 'healthcare',
  '🛍️': 'shopping',
  '🛍': 'shopping',
  '✈️': 'travel',
  '✈': 'travel',
  '📈': 'investing',
  '💰': 'bills',
};

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const KNOWN_ICON_NAMES = new Set([
  'shopping-cart', 'utensils', 'car', 'file-text', 'tv', 
  'heart', 'shopping-bag', 'plane', 'trending-up', 'tag', 'wallet'
]);

export function isGarbageCategory(cat: { id?: string; name?: string; icon?: string }): boolean {
  if (!cat) return true;
  const id = String(cat.id || '').trim();
  const name = String(cat.name || '').trim();

  // If name or ID is a UUID
  if (UUID_REGEX.test(name)) return true;

  // If name is an icon name
  if (KNOWN_ICON_NAMES.has(name.toLowerCase())) return true;

  // If name is an emoji
  if (ICON_AND_EMOJI_TO_CATEGORY[name]) return true;

  // If name is too short or weird symbols
  if (name.length <= 1 && !/^[a-zA-Z0-9]$/.test(name)) return true;

  return false;
}

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
    n.includes('cafe') ||
    n.includes('dining')
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
    n.includes('netflix') ||
    n.includes('rent') ||
    n.includes('recharge')
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
    n.includes('gym') ||
    n.includes('medicine')
  ) {
    return { icon: 'heart', color: 'cyan' };
  }

  // Shopping
  if (
    n.includes('shop') ||
    n.includes('amazon') ||
    n.includes('clothes') ||
    n.includes('gift') ||
    n.includes('flipkart')
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
    n.includes('uber') ||
    n.includes('auto') ||
    n.includes('cab')
  ) {
    return { icon: 'car', color: 'blue' };
  }

  // Entertainment
  if (
    n.includes('movie') ||
    n.includes('game') ||
    n.includes('party') ||
    n.includes('entertainment') ||
    n.includes('cinema') ||
    n.includes('ott')
  ) {
    return { icon: 'tv', color: 'orange' };
  }

  // Investing
  if (
    n.includes('invest') ||
    n.includes('stock') ||
    n.includes('crypto') ||
    n.includes('mutual fund') ||
    n.includes('sip') ||
    n.includes('gold')
  ) {
    return { icon: 'trending-up', color: 'green' };
  }

  // Groceries
  if (
    n.includes('grocery') ||
    n.includes('groceries') ||
    n.includes('market') ||
    n.includes('supermarket') ||
    n.includes('vegetable') ||
    n.includes('fruit') ||
    n.includes('blinkit') ||
    n.includes('zepto') ||
    n.includes('instamart')
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

/**
 * Universal Category Resolver:
 * Matches category by ID, Name, Icon, Emoji, or partial keywords (case-insensitive).
 * NEVER returns a UUID, icon name, or lone emoji as a category name.
 * Guarantees that no valid expense/item is ever left "Uncategorized".
 */
export function findCategory(categories: Category[], key?: string): Category {
  const validCategories = (categories || []).filter(c => !isGarbageCategory(c));

  if (!key) {
    return (
      validCategories.find(c => c.id === 'groceries') ||
      DEFAULT_CATEGORIES[0]
    );
  }

  const raw = String(key).trim();
  const cleanKey = raw.toLowerCase();

  // 1. If key is an icon name or emoji, map directly to corresponding default category
  if (ICON_AND_EMOJI_TO_CATEGORY[cleanKey] || ICON_AND_EMOJI_TO_CATEGORY[raw]) {
    const targetId = ICON_AND_EMOJI_TO_CATEGORY[cleanKey] || ICON_AND_EMOJI_TO_CATEGORY[raw];
    const match = validCategories.find(c => c.id === targetId) || DEFAULT_CATEGORIES.find(c => c.id === targetId);
    if (match) return match;
  }

  // 2. Direct ID match in valid categories
  const byId = validCategories.find(c => c.id.toLowerCase() === cleanKey);
  if (byId) return byId;

  // 3. Direct Name match in valid categories
  const byName = validCategories.find(c => c.name.toLowerCase() === cleanKey);
  if (byName) return byName;

  // 4. Default categories lookup (by ID or exact Name)
  const byDefault = DEFAULT_CATEGORIES.find(c => 
    c.id.toLowerCase() === cleanKey || 
    c.name.toLowerCase() === cleanKey
  );
  if (byDefault) return byDefault;

  // 5. Substring / partial match in valid categories or default categories
  const byIncludes = validCategories.find(c => 
    c.name.toLowerCase().includes(cleanKey) || cleanKey.includes(c.name.toLowerCase())
  );
  if (byIncludes) return byIncludes;

  const byDefaultIncludes = DEFAULT_CATEGORIES.find(c => 
    c.name.toLowerCase().includes(cleanKey) || cleanKey.includes(c.name.toLowerCase())
  );
  if (byDefaultIncludes) return byDefaultIncludes;

  // 6. If key is a UUID, do NOT treat the UUID as the category name!
  if (UUID_REGEX.test(cleanKey)) {
    // Check if by any chance an existing category has this id
    const existingById = (categories || []).find(c => c.id.toLowerCase() === cleanKey);
    if (existingById && !isGarbageCategory(existingById)) {
      return existingById;
    }
    // Fallback to Groceries default
    return DEFAULT_CATEGORIES[0];
  }

  // 7. Dynamic fallback for genuine custom categories (e.g. "Electronics", "Gifts", "Education")
  const guessed = guessCategoryProperties(raw);
  return {
    id: cleanKey.replace(/\s+/g, '-'),
    userId: 'local',
    name: raw.charAt(0).toUpperCase() + raw.slice(1),
    icon: guessed.icon,
    color: guessed.color,
    isDefault: false,
    updatedAt: new Date(),
  };
}

/**
 * Universal Category Key Normalizer:
 * Resolves any raw category input (from Excel import, user input, alias, icon, or ID)
 * into a canonical category ID matching an existing Category in the app.
 */
export function normalizeCategoryKey(categories: Category[], rawKey?: string): string {
  if (!rawKey) return 'groceries';
  const raw = String(rawKey).trim();
  const cleanKey = raw.toLowerCase();

  // If already matches a category ID directly
  const byId = (categories || []).find(c => c.id.toLowerCase() === cleanKey);
  if (byId && !isGarbageCategory(byId)) return byId.id;

  // Direct default category ID match
  const byDefaultId = DEFAULT_CATEGORIES.find(c => c.id.toLowerCase() === cleanKey);
  if (byDefaultId) return byDefaultId.id;

  // If matches an emoji or icon name
  if (ICON_AND_EMOJI_TO_CATEGORY[cleanKey] || ICON_AND_EMOJI_TO_CATEGORY[raw]) {
    return ICON_AND_EMOJI_TO_CATEGORY[cleanKey] || ICON_AND_EMOJI_TO_CATEGORY[raw];
  }

  // Exact Name match (case-insensitive) in user categories
  const byName = (categories || []).find(c => c.name.toLowerCase() === cleanKey);
  if (byName && !isGarbageCategory(byName)) return byName.id;

  // Exact Name match in default categories
  const byDefaultName = DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === cleanKey);
  if (byDefaultName) return byDefaultName.id;

  // Keyword / Substring mapping for common Indian and global financial categories
  if (
    cleanKey.includes('food') || cleanKey.includes('dining') || cleanKey.includes('restaurant') ||
    cleanKey.includes('eat') || cleanKey.includes('meal') || cleanKey.includes('swiggy') || 
    cleanKey.includes('zomato') || cleanKey.includes('cafe') || cleanKey.includes('snack') ||
    cleanKey.includes('lunch') || cleanKey.includes('dinner') || cleanKey.includes('breakfast')
  ) {
    return 'food';
  }

  if (
    cleanKey.includes('grocer') || cleanKey.includes('market') || cleanKey.includes('supermarket') ||
    cleanKey.includes('vegetable') || cleanKey.includes('fruit') || cleanKey.includes('blinkit') ||
    cleanKey.includes('zepto') || cleanKey.includes('instamart') || cleanKey.includes('ration') ||
    cleanKey.includes('milk') || cleanKey.includes('dairy') || cleanKey.includes('provision')
  ) {
    return 'groceries';
  }

  if (
    cleanKey.includes('transport') || cleanKey.includes('car') || cleanKey.includes('fuel') ||
    cleanKey.includes('petrol') || cleanKey.includes('diesel') || cleanKey.includes('uber') ||
    cleanKey.includes('ola') || cleanKey.includes('auto') || cleanKey.includes('taxi') ||
    cleanKey.includes('cab') || cleanKey.includes('metro') || cleanKey.includes('bus') ||
    cleanKey.includes('toll') || cleanKey.includes('parking')
  ) {
    return 'transport';
  }

  if (
    cleanKey.includes('bill') || cleanKey.includes('recharge') || cleanKey.includes('electric') ||
    cleanKey.includes('water') || cleanKey.includes('wifi') || cleanKey.includes('broadband') ||
    cleanKey.includes('utility') || cleanKey.includes('rent') || cleanKey.includes('maintenance') ||
    cleanKey.includes('gas') || cleanKey.includes('cylinder') || cleanKey.includes('dth') ||
    cleanKey.includes('mobile bill') || cleanKey.includes('phone bill') || cleanKey.includes('credit card')
  ) {
    return 'bills';
  }

  if (
    cleanKey.includes('entertain') || cleanKey.includes('movie') || cleanKey.includes('game') ||
    cleanKey.includes('cinema') || cleanKey.includes('netflix') || cleanKey.includes('hotstar') ||
    cleanKey.includes('prime') || cleanKey.includes('spotify') || cleanKey.includes('party') ||
    cleanKey.includes('concert') || cleanKey.includes('theatre') || cleanKey.includes('outing')
  ) {
    return 'entertainment';
  }

  if (
    cleanKey.includes('health') || cleanKey.includes('medic') || cleanKey.includes('doctor') ||
    cleanKey.includes('hospital') || cleanKey.includes('pharmacy') || cleanKey.includes('clinic') ||
    cleanKey.includes('dental') || cleanKey.includes('checkup') || cleanKey.includes('diagnostic') ||
    cleanKey.includes('lab') || cleanKey.includes('therapy')
  ) {
    return 'healthcare';
  }

  if (
    cleanKey.includes('shop') || cleanKey.includes('amazon') || cleanKey.includes('flipkart') ||
    cleanKey.includes('cloth') || cleanKey.includes('myntra') || cleanKey.includes('dress') ||
    cleanKey.includes('apparel') || cleanKey.includes('footwear') || cleanKey.includes('shoes') ||
    cleanKey.includes('gadget') || cleanKey.includes('electronics') || cleanKey.includes('accessory')
  ) {
    return 'shopping';
  }

  if (
    cleanKey.includes('travel') || cleanKey.includes('trip') || cleanKey.includes('flight') ||
    cleanKey.includes('hotel') || cleanKey.includes('vacation') || cleanKey.includes('tour') ||
    cleanKey.includes('train') || cleanKey.includes('irctc') || cleanKey.includes('booking') ||
    cleanKey.includes('resort') || cleanKey.includes('stay')
  ) {
    return 'travel';
  }

  if (
    cleanKey.includes('invest') || cleanKey.includes('stock') || cleanKey.includes('crypto') ||
    cleanKey.includes('mutual') || cleanKey.includes('sip') || cleanKey.includes('share') ||
    cleanKey.includes('gold') || cleanKey.includes('fd') || cleanKey.includes('rd') ||
    cleanKey.includes('zerodha') || cleanKey.includes('groww') || cleanKey.includes('upstox')
  ) {
    return 'investing';
  }

  // Check if it's a known custom category substring
  const partial = (categories || []).find(c => 
    !isGarbageCategory(c) && (cleanKey.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cleanKey))
  );
  if (partial) return partial.id;

  // Fallback: if key is UUID or garbage, default to groceries
  if (UUID_REGEX.test(cleanKey) || isGarbageCategory({ name: raw })) {
    return 'groceries';
  }

  // Return clean alphanumeric key for genuine custom categories
  return cleanKey.replace(/[^a-z0-9_-]/g, '_');
}

/**
 * Automatically cleans up any corrupted or duplicate categories in IndexedDB:
 * 1. Purges categories with UUIDs, icon names, or lone emojis as names.
 * 2. Remaps expenses, budgets, debts, and recurring rules from deleted garbage category IDs to canonical category IDs.
 * 3. Ensures all 9 DEFAULT_CATEGORIES exist.
 * 4. Deduplicates any duplicate categories by lowercased name.
 */
export async function cleanupAndDeduplicateCategories(db: any) {
  try {
    const existingCategories: Category[] = await db.categories.toArray();
    const toDeleteIds: string[] = [];
    const idRemap: Record<string, string> = {};

    // 1. Identify garbage categories
    for (const cat of existingCategories) {
      if (isGarbageCategory(cat)) {
        toDeleteIds.push(cat.id);
        const canonical = findCategory(DEFAULT_CATEGORIES, cat.name || cat.icon || cat.id);
        idRemap[cat.id] = canonical.id;
      }
    }

    // 2. Identify duplicates by name
    const seenNames = new Map<string, Category>();
    for (const cat of existingCategories) {
      if (toDeleteIds.includes(cat.id)) continue;
      const lowerName = cat.name.toLowerCase().trim();
      if (seenNames.has(lowerName)) {
        const canonical = seenNames.get(lowerName)!;
        toDeleteIds.push(cat.id);
        idRemap[cat.id] = canonical.id;
      } else {
        seenNames.set(lowerName, cat);
      }
    }

    // 3. Remap references across all tables
    if (Object.keys(idRemap).length > 0) {
      // Remap in expenses
      const expenses = await db.expenses.toArray();
      const modifiedExpenses = [];
      for (const exp of expenses) {
        if (idRemap[exp.category]) {
          exp.category = idRemap[exp.category];
          modifiedExpenses.push(exp);
        }
      }
      if (modifiedExpenses.length > 0) {
        await db.expenses.bulkPut(modifiedExpenses);
      }

      // Remap in recurringExpenses
      const recExpenses = await db.recurringExpenses.toArray();
      const modifiedRecExpenses = [];
      for (const r of recExpenses) {
        if (idRemap[r.category]) {
          r.category = idRemap[r.category];
          modifiedRecExpenses.push(r);
        }
      }
      if (modifiedRecExpenses.length > 0) {
        await db.recurringExpenses.bulkPut(modifiedRecExpenses);
      }

      // Remap in budgets
      const budgets = await db.budgets.toArray();
      const modifiedBudgets = [];
      for (const b of budgets) {
        if (idRemap[b.category]) {
          b.category = idRemap[b.category];
          modifiedBudgets.push(b);
        }
      }
      if (modifiedBudgets.length > 0) {
        await db.budgets.bulkPut(modifiedBudgets);
      }
    }

    // 4. Delete the garbage category records
    if (toDeleteIds.length > 0) {
      await db.categories.bulkDelete(toDeleteIds);
    }

    // 5. Ensure all DEFAULT_CATEGORIES exist
    const remainingCategories: Category[] = await db.categories.toArray();
    const missingDefaults = DEFAULT_CATEGORIES.filter(
      def => !remainingCategories.some(c => c.id.toLowerCase() === def.id.toLowerCase() || c.name.toLowerCase() === def.name.toLowerCase())
    );
    if (missingDefaults.length > 0) {
      await db.categories.bulkAdd(missingDefaults);
    }
  } catch (err) {
    console.error('Error during category cleanup:', err);
  }
}
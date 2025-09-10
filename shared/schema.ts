import { z } from 'zod';
import { parseISO, format } from 'date-fns';

// ============================================================================
// Expense Schema
// ============================================================================

export const expenseFormSchema = z.object({
  id: z.string().optional(),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'), // store as ISO string
  time: z.string().min(1, 'Time is required'),
  category: z.string().min(1, 'Category is required'),
  items: z.string().optional(),
  where: z.string().optional(),
  note: z.string().optional(),
  paymentMethod: z.enum(['UPI', 'Cash', 'Card', 'Other']),
  account: z.enum(['ICICI', 'HDFC', 'SBI', 'Other'], { required_error: 'Account is required' }),
  isRecurring: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  attachments: z.array(z.string()).optional(),
});

export type Expense = z.infer<typeof expenseFormSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type InsertExpense = z.infer<typeof expenseFormSchema>;

// ============================================================================
// Budget Schema
// ============================================================================

export const insertBudgetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string(), // ISO string
  isActive: z.boolean().default(true),
});

export type Budget = z.infer<typeof insertBudgetSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type InsertBudget = z.infer<typeof insertBudgetSchema>;

// ============================================================================
// Category Schema
// ============================================================================

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  isDefault: z.boolean().optional(),
});

export type Category = z.infer<typeof categorySchema>;
export type InsertCategory = Omit<Category, 'id'>;

// ============================================================================
// Settings Schema
// ============================================================================

export const settingsSchema = z.object({
  id: z.string(),
  currency: z.enum(['₹', '$', '€', '£']),
  theme: z.enum(['light', 'dark']),
  language: z.enum(['en']),
  notifications: z.boolean(),
  budgetAlerts: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type InsertSettings = z.infer<typeof settingsSchema>;

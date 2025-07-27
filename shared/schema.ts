import { z } from "zod";

// Expense schema
export const expenseSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  date: z.string(), // ISO date string
  time: z.string(), // HH:MM format
  category: z.string(),
  items: z.string().optional(),
  where: z.string().optional(),
  note: z.string().optional(),
  paymentMethod: z.enum(["UPI", "Card", "Net Banking", "Cash"]),
  account: z.enum(["ICICI", "SBI", "HDFC", "Axis", "Other"]),
  isRecurring: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  attachments: z.array(z.string()).default([]), // base64 encoded files
  createdAt: z.string(), // ISO timestamp
  updatedAt: z.string(), // ISO timestamp
});

export const insertExpenseSchema = expenseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Expense = z.infer<typeof expenseSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  isDefault: z.boolean().default(false),
});

export const insertCategorySchema = categorySchema.omit({
  id: true,
});

export type Category = z.infer<typeof categorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Budget schema
export const budgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().positive(),
  category: z.string(),
  period: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.string(), // ISO date string
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertBudgetSchema = budgetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Budget = z.infer<typeof budgetSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

// Settings schema
export const settingsSchema = z.object({
  id: z.string(),
  currency: z.string().default("₹"),
  theme: z.enum(["light", "dark"]).default("light"),
  language: z.string().default("en"),
  notifications: z.boolean().default(true),
  budgetAlerts: z.boolean().default(true),
});

export const insertSettingsSchema = settingsSchema.omit({
  id: true,
});

export type Settings = z.infer<typeof settingsSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Form validation schemas
export const expenseFormSchema = insertExpenseSchema.extend({
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Please select a category"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
});

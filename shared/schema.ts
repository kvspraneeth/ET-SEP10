import { z } from 'zod';
import { pgTable, text, serial, timestamp, boolean, real, varchar, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ============================================================================
// Drizzle Cloud Database Tables
// ============================================================================

export const debtRecords = pgTable('debt_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(), 
  type: text('type').notNull(),
  amount: numeric('amount').notNull(),
  purpose: text('purpose').notNull(),
  location: text('location'),
  personName: text('person_name').notNull(),
  notes: text('notes'),
  datetime: timestamp('datetime'),
  status: text('status').default('pending').notNull(), 
  createdAt: timestamp('created_at').defaultNow()
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").unique().notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(), 
  userId: text("user_id").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  category: text("category").notNull(),
  items: text("items"),
  where: text("where"),
  note: text("note"),
  paymentMethod: text("payment_method").notNull(),
  account: text("account").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  isTemplate: boolean("is_template").default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  isDefault: boolean("is_default").default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  period: text("period").notNull(),
  startDate: text("start_date").notNull(),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  currency: text("currency").notNull(),
  theme: text("theme").notNull(),
  language: text("language").notNull(),
  notifications: boolean("notifications").default(true),
  budgetAlerts: boolean("budget_alerts").default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Types & Zod Schemas
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const expenseFormSchema = z.object({
  id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  category: z.string().min(1, 'Category is required'),
  items: z.string().optional(),
  where: z.string().optional(),
  note: z.string().optional(),
  
  // CHANGED: These are now flexible strings instead of strict enums
  paymentMethod: z.string().min(1, 'Payment method is required'),
  account: z.string().min(1, 'Account is required'),
  
  isRecurring: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  attachments: z.array(z.string()).optional(),
});

export type Expense = z.infer<typeof expenseFormSchema> & { id: string; createdAt: string; updatedAt: string };
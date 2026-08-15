import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { Budget, InsertBudget } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';

export function useBudgets() {
  const allBudgets = useLiveQuery(() => db.budgets.toArray()) || [];
  return allBudgets;
}

export function useActiveBudgets() {
  const allBudgets = useBudgets();
  return allBudgets.filter(b => b.isActive !== false);
}

export function useBudgetProgress(budget: Budget) {
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  switch (budget.period) {
    case 'weekly':
      periodStart = startOfWeek(now, { weekStartsOn: 1 });
      periodEnd = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'yearly':
      periodStart = startOfYear(now);
      periodEnd = endOfYear(now);
      break;
    case 'monthly':
    default:
      periodStart = startOfMonth(now);
      periodEnd = endOfMonth(now);
      break;
  }

  // Filter expenses matching category (or all if category is 'ALL') and within period
  const matchingExpenses = pastExpenses.filter(expense => {
    if (!expense.date) return false;
    const isCategoryMatch = budget.category === 'ALL' || expense.category === budget.category;
    if (!isCategoryMatch) return false;

    try {
      const expDate = parseISO(expense.date);
      return expDate >= periodStart && expDate <= periodEnd;
    } catch {
      return false;
    }
  });

  const spent = matchingExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const budgetAmount = Number(budget.amount) || 0;
  const remaining = Math.max(0, budgetAmount - spent);
  const rawPercentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
  const percentage = Math.min(100, rawPercentage);
  const isOverBudget = spent > budgetAmount;
  const overAmount = isOverBudget ? spent - budgetAmount : 0;

  return {
    spent,
    remaining,
    percentage,
    rawPercentage,
    isOverBudget,
    overAmount,
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    transactionCount: matchingExpenses.length,
  };
}

export type InsertBudgetPayload = {
  name: string;
  amount: number;
  category: string;
  period: string;
  startDate: string;
  isActive?: boolean;
};

export function useAddBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (budget: InsertBudgetPayload) => {
      const now = new Date();
      const newBudget: Budget = {
        id: crypto.randomUUID(),
        userId: 'local',
        name: budget.name,
        amount: Number(budget.amount),
        category: budget.category,
        period: budget.period,
        startDate: budget.startDate,
        isActive: budget.isActive ?? true,
        updatedAt: now,
      };
      
      await db.budgets.add(newBudget);
      return newBudget;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create budget.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (budget: Budget) => {
      await db.budgets.update(budget.id, {
        name: budget.name,
        amount: Number(budget.amount),
        category: budget.category,
        period: budget.period,
        startDate: budget.startDate,
        isActive: budget.isActive,
        updatedAt: new Date(),
      });
      return budget;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update budget.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.budgets.delete(id);
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Budget has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete budget.",
        variant: "destructive",
      });
    },
  });
}

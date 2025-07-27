import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { Budget, InsertBudget } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useExpensesByCategory } from './use-expenses';

export function useBudgets() {
  const budgets = useLiveQuery(() => 
    db.budgets
      .where('isActive')
      .equals(1)
      .toArray()
  ) || [];

  return budgets;
}

export function useBudgetProgress(budget: Budget) {
  const expenses = useExpensesByCategory(budget.category);
  
  const now = new Date();
  const startDate = new Date(budget.startDate);
  
  let periodStart: Date;
  let periodEnd: Date;

  switch (budget.period) {
    case 'weekly':
      periodStart = new Date(startDate);
      periodStart.setDate(startDate.getDate() - startDate.getDay());
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      break;
    case 'monthly':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'yearly':
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      periodStart = startDate;
      periodEnd = now;
  }

  const periodExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= periodStart && expenseDate <= periodEnd;
  });

  const spent = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = Math.max(0, budget.amount - spent);
  const percentage = Math.min(100, (spent / budget.amount) * 100);
  const isOverBudget = spent > budget.amount;

  return {
    spent,
    remaining,
    percentage,
    isOverBudget,
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
  };
}

export function useAddBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (budget: InsertBudget) => {
      const now = new Date().toISOString();
      const newBudget: Budget = {
        ...budget,
        id: crypto.randomUUID(),
        createdAt: now,
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create budget. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to create budget:', error);
    },
  });
}

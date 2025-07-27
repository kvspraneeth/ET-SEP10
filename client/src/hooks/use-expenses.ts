import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { Expense, InsertExpense } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export function useExpenses() {
  const expenses = useLiveQuery(() => 
    db.expenses
      .orderBy('createdAt')
      .reverse()
      .toArray()
  ) || [];

  return expenses;
}

export function useExpensesByDateRange(startDate: string, endDate: string) {
  const expenses = useLiveQuery(() => 
    db.expenses
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray()
  ) || [];

  return expenses;
}

export function useExpensesByCategory(category: string) {
  const expenses = useLiveQuery(() => 
    db.expenses
      .where('category')
      .equals(category)
      .toArray()
  ) || [];

  return expenses;
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (expense: InsertExpense) => {
      const now = new Date().toISOString();
      const newExpense: Expense = {
        ...expense,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      
      await db.expenses.add(newExpense);
      return newExpense;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to add expense:', error);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      const updatedExpense = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await db.expenses.update(id, updatedExpense);
      return updatedExpense;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to update expense:', error);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.expenses.delete(id);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to delete expense:', error);
    },
  });
}

export function useExpenseStats() {
  const expenses = useExpenses();
  
  const today = new Date().toISOString().split('T')[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().split('T')[0];
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = startOfMonth.toISOString().split('T')[0];

  const todayTotal = expenses
    .filter(expense => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const weekTotal = expenses
    .filter(expense => expense.date >= weekStart)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const monthTotal = expenses
    .filter(expense => expense.date >= monthStart)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    todayTotal,
    weekTotal,
    monthTotal,
  };
}

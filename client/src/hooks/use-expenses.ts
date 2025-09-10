import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { Expense, InsertExpense } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

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

export function useExpensesByAccount(account: string) {
    const expenses = useLiveQuery(() =>
      db.expenses
        .where('account')
        .equals(account)
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
    mutationFn: async (expense: Expense) => {
      const updatedExpense = {
        ...expense,
        updatedAt: new Date().toISOString(),
      };
      
      await db.expenses.update(expense.id, updatedExpense);
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

export function useExpenseTotals(dateRange?: DateRange) {
  const expenses = useExpenses();
  
  const now = new Date();

  const todayTotal = expenses
    .filter(e => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= startOfDay(now) && expenseDate <= endOfDay(now);
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const weekTotal = expenses
    .filter(e => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= startOfWeek(now) && expenseDate <= endOfWeek(now);
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const monthTotal = expenses
    .filter(e => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= startOfMonth(now) && expenseDate <= endOfMonth(now);
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  const rangeTotal = dateRange?.from
    ? expenses
        .filter(e => {
            const expenseDate = parseISO(e.date);
            const from = startOfDay(dateRange.from!);
            const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
            return expenseDate >= from && expenseDate <= to;
        })
        .reduce((sum, expense) => sum + expense.amount, 0)
    : 0;


  return {
    todayTotal,
    weekTotal,
    monthTotal,
    rangeTotal,
  };
}
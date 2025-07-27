import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, PiggyBank } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBudgets, useBudgetProgress, useAddBudget } from '@/hooks/use-budgets';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { useSettings } from '@/hooks/use-settings';
import { insertBudgetSchema } from '@shared/schema';
import { format } from 'date-fns';

export function Budget() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const budgets = useBudgets();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useSettings();
  const addBudgetMutation = useAddBudget();
  
  const currency = settings?.currency || '₹';

  const form = useForm({
    resolver: zodResolver(insertBudgetSchema),
    defaultValues: {
      name: '',
      amount: 0,
      category: '',
      period: 'monthly' as const,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      isActive: true,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await addBudgetMutation.mutateAsync(data);
      form.reset();
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Failed to create budget:', error);
    }
  };

  const formatAmount = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget Tracker</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your spending limits and track progress
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Monthly Groceries" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-8"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={addBudgetMutation.isPending}
                  >
                    {addBudgetMutation.isPending ? 'Creating...' : 'Create Budget'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budgets List */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <PiggyBank className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No budgets created yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Create your first budget to start tracking your spending limits
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              currency={currency}
              formatAmount={formatAmount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetCard({ budget, currency, formatAmount }: any) {
  const progress = useBudgetProgress(budget);
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  
  const category = categories.find(cat => cat.id === budget.category);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span>{category?.icon || '📊'}</span>
            </div>
            <div>
              <CardTitle className="text-base">{budget.name}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {budget.period} • {category?.name || 'Unknown Category'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatAmount(budget.amount)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(budget.startDate), 'MMM d')}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span>Spent: {formatAmount(progress.spent)}</span>
            <span className={progress.isOverBudget ? 'text-red-500' : 'text-gray-500'}>
              {progress.isOverBudget ? 'Over budget!' : `${formatAmount(progress.remaining)} left`}
            </span>
          </div>
          
          <Progress 
            value={progress.percentage} 
            className="h-3"
            style={{
              '--progress-background': progress.isOverBudget ? '#ef4444' : '#22c55e'
            } as React.CSSProperties}
          />
          
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{Math.round(progress.percentage)}% used</span>
            <span>
              {format(new Date(progress.periodStart), 'MMM d')} - {format(new Date(progress.periodEnd), 'MMM d')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

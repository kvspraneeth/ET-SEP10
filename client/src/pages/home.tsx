import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsOverview } from '@/components/stats-overview';
import { CategorySelector } from '@/components/category-selector';
import { RecentExpenses } from '@/components/recent-expenses';
import { BudgetOverview } from '@/components/budget-overview';
import { ExpenseForm } from '@/components/expense-form';
import { PieChart, Plus } from 'lucide-react';

interface HomeProps {
  onTabChange: (tab: string) => void;
  onOpenExpenseForm: (selectedCategory?: string) => void;
}

export function Home({ onTabChange, onOpenExpenseForm }: HomeProps) {
  const handleCategorySelect = (categoryId: string) => {
    // Quick add expense with pre-selected category
    onOpenExpenseForm(categoryId);
  };

  const handleViewAllExpenses = () => {
    onTabChange('expenses');
  };

  return (
    <div className="p-4 space-y-6">
      {/* Stats Overview */}
      <StatsOverview />

      {/* Quick Category Overview */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <PieChart className="w-4 h-4 mr-2 text-primary" />
            Quick Add
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CategorySelector
            onCategorySelect={handleCategorySelect}
            variant="pill"
            limit={7}
          />
          <div className="mt-3 text-center">
            <button
              onClick={() => onOpenExpenseForm()}
              className="category-pill bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl text-center text-xs font-medium w-16"
            >
              <div className="text-lg mb-1">
                <Plus className="w-4 h-4 mx-auto" />
              </div>
              <div>More</div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <RecentExpenses onViewAll={handleViewAllExpenses} />

      {/* Budget Overview */}
      <BudgetOverview />
    </div>
  );
}

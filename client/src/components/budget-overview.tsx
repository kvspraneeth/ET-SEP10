import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PiggyBank } from 'lucide-react';
import { useBudgets, useBudgetProgress } from '@/hooks/use-budgets';
import { useSettings } from '@/hooks/use-settings';

export function BudgetOverview() {
  const budgets = useBudgets();
  const settings = useSettings();
  
  const currency = settings?.currency || '₹';

  const formatAmount = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  if (budgets.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <PiggyBank className="w-4 h-4 mr-2 text-primary" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No budgets set</p>
            <p className="text-sm">Create budgets to track your spending!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <PiggyBank className="w-4 h-4 mr-2 text-primary" />
          Budget Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {budgets.slice(0, 3).map((budget) => {
            const progress = useBudgetProgress(budget);
            
            return (
              <BudgetItem
                key={budget.id}
                budget={budget}
                progress={progress}
                currency={currency}
                formatAmount={formatAmount}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetItem({ budget, progress, currency, formatAmount }: any) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-sm">{budget.name}</span>
        <span className="text-sm">
          {formatAmount(progress.spent)} / {formatAmount(budget.amount)}
        </span>
      </div>
      <Progress 
        value={progress.percentage} 
        className="h-2 mb-1"
        style={{
          '--progress-background': progress.isOverBudget ? '#ef4444' : '#22c55e'
        } as React.CSSProperties}
      />
      <p className={`text-xs mt-1 ${
        progress.isOverBudget 
          ? 'text-red-500' 
          : 'text-gray-500 dark:text-gray-400'
      }`}>
        {progress.isOverBudget 
          ? `${currency}${(progress.spent - budget.amount).toLocaleString()} over budget!`
          : `${formatAmount(progress.remaining)} remaining this ${budget.period.slice(0, -2)}`
        }
      </p>
    </div>
  );
}

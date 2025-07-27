import { ExpenseCharts } from '@/components/expense-charts';

export function Charts() {
  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Visualize your spending patterns and insights
        </p>
      </div>
      
      <ExpenseCharts />
    </div>
  );
}

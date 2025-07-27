import { Card, CardContent } from '@/components/ui/card';
import { useExpenseStats } from '@/hooks/use-expenses';
import { useSettings } from '@/hooks/use-settings';

export function StatsOverview() {
  const { todayTotal, weekTotal, monthTotal } = useExpenseStats();
  const settings = useSettings();
  
  const currency = settings?.currency || '₹';

  const formatAmount = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="stats-card bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatAmount(todayTotal)}
          </p>
        </CardContent>
      </Card>
      
      <Card className="stats-card bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">This Week</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatAmount(weekTotal)}
          </p>
        </CardContent>
      </Card>
      
      <Card className="stats-card bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">This Month</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {formatAmount(monthTotal)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

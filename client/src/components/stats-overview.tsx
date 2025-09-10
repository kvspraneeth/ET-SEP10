import { Card, CardContent } from '@/components/ui/card';
import { useExpenseTotals } from '@/hooks/use-expenses';
import { useSettings } from '@/hooks/use-settings';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface StatsOverviewProps {
  dateRange?: DateRange;
}

export function StatsOverview({ dateRange }: StatsOverviewProps) {
  const { todayTotal, weekTotal, monthTotal, rangeTotal } = useExpenseTotals(dateRange);
  const settings = useSettings();
  
  const currency = settings?.currency || '₹';

  const formatAmount = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  if (dateRange?.from) {
    const from = format(dateRange.from, "LLL dd, y");
    const to = dateRange.to ? ` - ${format(dateRange.to, "LLL dd, y")}` : '';
    return (
      <Card className="stats-card bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total for {from}{to}
          </p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatAmount(rangeTotal)}
          </p>
        </CardContent>
      </Card>
    );
  }

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


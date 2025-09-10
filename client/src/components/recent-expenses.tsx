import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ShoppingCart, Utensils, Car, FileText, Tv, Heart, ShoppingBag, LucideIcon } from 'lucide-react';
import { useExpenses } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor } from '@/lib/categories';
import { useSettings } from '@/hooks/use-settings';
import { format, parseISO, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface RecentExpensesProps {
  onViewAll: () => void;
  limit?: number;
  dateRange?: DateRange;
}

const iconMap: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'car': Car,
  'file-text': FileText,
  'tv': Tv,
  'heart': Heart,
  'shopping-bag': ShoppingBag,
};

export function RecentExpenses({ onViewAll, limit = 5, dateRange }: RecentExpensesProps) {
  const allExpenses = useExpenses();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useSettings();
  
  const currency = settings?.currency || '₹';

  const expenses = dateRange?.from 
    ? allExpenses.filter(e => {
        const expenseDate = new Date(e.date);
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return expenseDate >= from && expenseDate <= to;
      })
    : allExpenses;

  const recentExpenses = expenses.slice(0, limit);

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || {
      id: categoryId,
      name: 'Other',
      icon: 'file-text',
      color: 'gray'
    };
  };

  const formatDate = (dateStr: string, timeStr: string) => {
    const date = parseISO(dateStr);
    const time = timeStr || '00:00';
    
    if (isToday(date)) {
      return `Today, ${time}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${time}`;
    } else {
      return `${format(date, 'MMM d')}, ${time}`;
    }
  };

  const formatAmount = (amount: number) => {
    return `-${currency}${amount.toLocaleString()}`;
  };

  if (recentExpenses.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            {dateRange?.from ? 'Expenses in Range' : 'Recent Expenses'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No expenses found</p>
            <p className="text-sm">{dateRange?.from ? 'Try a different date range.' : 'Add your first expense!'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-base">
            <Clock className="w-4 h-4 mr-2 text-primary" />
             {dateRange?.from ? 'Expenses in Range' : 'Recent Expenses'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-primary">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentExpenses.map((expense) => {
            const category = getCategoryInfo(expense.category);
            const colors = getCategoryColor(category.color);
            
            return (
              <div
                key={expense.id}
                className="expense-card flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                    {getIconComponent(category.icon)}
                  </div>
                  <div>
                    <p className="font-medium">{expense.items || category.name}</p>
                    {expense.where && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{expense.where}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(expense.date, expense.time)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    {formatAmount(expense.amount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {expense.paymentMethod}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

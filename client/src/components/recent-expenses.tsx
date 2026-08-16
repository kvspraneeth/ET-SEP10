import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight } from 'lucide-react';
import { useExpenses } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor, findCategory } from '@/lib/categories';
import { getIconComponent } from '@/components/category-selector';
import { useSettings } from '@/hooks/use-settings';
import { format, parseISO, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface RecentExpensesProps {
  onViewAll: () => void;
  limit?: number;
  dateRange?: DateRange;
}

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

  const getCategoryInfo = (categoryId: string) => {
    return findCategory(categories, categoryId);
  };

  const formatDate = (dateStr: string, timeStr: string) => {
    try {
      const date = parseISO(dateStr);
      const time = timeStr || '00:00';
      
      if (isToday(date)) {
        return `Today, ${time}`;
      } else if (isYesterday(date)) {
        return `Yesterday, ${time}`;
      } else {
        return `${format(date, 'MMM d')}, ${time}`;
      }
    } catch {
      return dateStr || '';
    }
  };

  const formatAmount = (amount: number) => {
    return `-${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (recentExpenses.length === 0) {
    return (
      <Card className="m3-card shadow-xs border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
          <CardTitle className="flex items-center text-sm sm:text-base font-bold text-foreground">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            <span>{dateRange?.from ? 'Expenses in Range' : 'Recent Transactions'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4">
          <div className="text-center py-8 text-muted-foreground bg-muted/40 rounded-2xl border border-dashed border-border">
            <p className="text-xs font-semibold">No recent transactions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{dateRange?.from ? 'Try a different date range.' : 'Tap Quick Add or + to log an expense!'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m3-card shadow-xs border-border bg-card">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm sm:text-base font-bold text-foreground">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            <span>{dateRange?.from ? 'Expenses in Range' : 'Recent Transactions'}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="h-8 px-2 text-xs font-bold text-primary hover:bg-primary/10 gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4">
        <div className="space-y-2">
          {recentExpenses.map((expense) => {
            const category = getCategoryInfo(expense.category);
            const colors = getCategoryColor(category?.color || 'gray');
            
            return (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/70 transition-all tap-spring"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text} shadow-xs`}>
                    {getIconComponent(category?.icon || 'tag', "w-5 h-5")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-foreground truncate">{expense.items || category?.name || 'Expense'}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate mt-0.5">
                      <span>{category?.name || 'General'}</span>
                      {expense.where && <span>• {expense.where}</span>}
                      <span>• {formatDate(expense.date, expense.time)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                    {formatAmount(expense.amount)}
                  </p>
                  <span className="text-[10px] text-muted-foreground font-semibold bg-background px-1.5 py-0.5 rounded-md border border-border mt-0.5 inline-block">
                    {expense.paymentMethod}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

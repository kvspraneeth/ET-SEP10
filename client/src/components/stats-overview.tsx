import { Card, CardContent } from '@/components/ui/card';
import { useExpenseTotals } from '@/hooks/use-expenses';
import { useSettings } from '@/hooks/use-settings';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, Sparkles } from 'lucide-react';
import { InfoButton } from './info-button';

interface StatsOverviewProps {
  dateRange?: DateRange;
}

export function StatsOverview({ dateRange }: StatsOverviewProps) {
  const { todayTotal, weekTotal, monthTotal, rangeTotal } = useExpenseTotals(dateRange);
  const settings = useSettings();
  
  const currency = settings?.currency || '₹';

  const formatAmount = (amount: number) => {
    return `${currency}${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  if (dateRange?.from) {
    const from = format(dateRange.from, "LLL dd, y");
    const to = dateRange.to ? ` - ${format(dateRange.to, "LLL dd, y")}` : '';
    return (
      <Card className="m3-card shadow-sm border-border bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total for {from}{to}
              </p>
              <InfoButton
                title="Date Range Expense Total"
                description={`Total amount of all logged transactions between ${from}${to}.`}
              />
            </div>
            <p className="text-xl sm:text-2xl font-black text-primary mt-0.5">
              {formatAmount(rangeTotal)}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <Calendar className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
      {/* Today Metric */}
      <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-xs hover:shadow-sm transition-all tap-spring flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Today</span>
            <InfoButton
              title="Today's Spend"
              description="Sum of all expenses logged for today's date."
              align="start"
            />
          </div>
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </div>
        <div className="mt-2">
          <p className="text-base sm:text-xl font-black text-foreground truncate">
            {formatAmount(todayTotal)}
          </p>
          <span className="text-[10px] text-muted-foreground block truncate">Daily spend</span>
        </div>
      </div>
      
      {/* This Week Metric */}
      <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-xs hover:shadow-sm transition-all tap-spring flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">This Week</span>
            <InfoButton
              title="7-Day Run / This Week"
              description="Cumulative expenses logged in the current calendar week (starting Monday)."
              align="center"
            />
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className="mt-2">
          <p className="text-base sm:text-xl font-black text-foreground truncate">
            {formatAmount(weekTotal)}
          </p>
          <span className="text-[10px] text-muted-foreground block truncate">7-day run</span>
        </div>
      </div>
      
      {/* This Month Metric */}
      <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-xs hover:shadow-sm transition-all tap-spring flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">This Month</span>
            <InfoButton
              title="Monthly Total"
              description="Total amount of all expenses logged from day 1 to today in the current month."
              align="end"
            />
          </div>
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="mt-2">
          <p className="text-base sm:text-xl font-black text-primary truncate">
            {formatAmount(monthTotal)}
          </p>
          <span className="text-[10px] text-muted-foreground block truncate">Monthly total</span>
        </div>
      </div>
    </div>
  );
}

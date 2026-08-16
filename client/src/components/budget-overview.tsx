import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PiggyBank, ShieldCheck, AlertCircle, ChevronRight } from 'lucide-react';
import { useBudgets, useBudgetProgress } from '@/hooks/use-budgets';
import { useSettings } from '@/hooks/use-settings';

export function BudgetOverview() {
  const budgets = useBudgets();
  const settings = useSettings();
  
  const currency = settings?.currency || '₹';

  const formatAmount = (amount: number) => {
    return `${currency}${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  if (budgets.length === 0) {
    return (
      <Card className="m3-card shadow-xs border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
          <CardTitle className="flex items-center text-sm sm:text-base font-bold text-foreground">
            <PiggyBank className="w-4 h-4 mr-2 text-primary" />
            <span>Budget Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4">
          <div className="text-center py-6 text-muted-foreground bg-muted/40 rounded-2xl border border-dashed border-border">
            <p className="text-xs font-semibold">No active budgets set</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Create budgets to track your limits & save money!</p>
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
            <PiggyBank className="w-4 h-4 mr-2 text-primary" />
            <span>Budget Pulse</span>
          </CardTitle>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {budgets.length} Active
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 space-y-3">
        {budgets.slice(0, 3).map((budget) => (
          <BudgetItem
            key={budget.id}
            budget={budget}
            currency={currency}
            formatAmount={formatAmount}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function BudgetItem({ budget, currency, formatAmount }: any) {
  const progress = useBudgetProgress(budget);
  const isOver = progress.isOverBudget;
  const isNear = progress.percentage >= 80 && !isOver;

  return (
    <div className="p-3 sm:p-3.5 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/80 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isOver ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          )}
          <span className="font-bold text-xs sm:text-sm text-foreground truncate">{budget.name}</span>
        </div>
        <span className="text-xs font-bold text-foreground shrink-0 ml-2">
          {formatAmount(progress.spent)} <span className="text-muted-foreground font-normal">/ {formatAmount(budget.amount)}</span>
        </span>
      </div>
      <Progress 
        value={Math.min(100, progress.percentage)} 
        className="h-2 rounded-full bg-border"
        style={{
          '--progress-background': isOver ? '#f43f5e' : (isNear ? '#f59e0b' : '#10b981')
        } as React.CSSProperties}
      />
      <div className="flex items-center justify-between mt-1.5 text-[10px] sm:text-[11px]">
        <span className={isOver ? 'text-rose-500 font-bold' : (isNear ? 'text-amber-500 font-bold' : 'text-muted-foreground')}>
          {isOver 
            ? `${currency}${(progress.spent - budget.amount).toLocaleString('en-IN')} over limit`
            : `${formatAmount(progress.remaining)} remaining`
          }
        </span>
        <span className="text-muted-foreground font-medium">
          {Math.round(progress.percentage)}%
        </span>
      </div>
    </div>
  );
}

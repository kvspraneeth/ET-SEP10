import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { StatsOverview } from '@/components/stats-overview';
import { RecentExpenses } from '@/components/recent-expenses';
import { BudgetOverview } from '@/components/budget-overview';
import { getCategoryColor, findCategory } from '@/lib/categories';
import { getIconComponent, CategorySelector } from '@/components/category-selector';
import { useSettings } from '@/hooks/use-settings';
import { InfoButton } from '@/components/info-button';
import { 
  Zap, Plus, ChevronRight, Sparkles, Search, Clock, 
  TrendingDown, TrendingUp, Wallet, ArrowUpRight, BarChart3, 
  PiggyBank, Receipt, ArrowRightLeft, ShieldCheck, AlertCircle
} from 'lucide-react';
import { Expense } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  formatDistanceToNow, parseISO, startOfMonth, endOfMonth, 
  subMonths, getDaysInMonth, getDate 
} from 'date-fns';

interface HomeProps {
  onTabChange: (tab: string) => void;
  onOpenExpenseForm: (expenseOrCategory?: any) => void;
}

export function Home({ onTabChange, onOpenExpenseForm }: HomeProps) {
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];
  const debts = useLiveQuery(() => db.debts.toArray()) || [];
  const settings = useSettings();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [moreSearchQuery, setMoreSearchQuery] = useState('');

  const currencySymbol = settings?.currency || '₹';

  // Dynamic Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Compute Current Month Total vs Last Month Total for M3 Trend Badge
  const { currentMonthTotal, lastMonthTotal, monthDiffPercentage, topCategoryStat } = useMemo(() => {
    const now = new Date();
    const currStart = startOfMonth(now);
    const currEnd = endOfMonth(now);

    const prevMonthDate = subMonths(now, 1);
    const prevStart = startOfMonth(prevMonthDate);
    const prevEnd = endOfMonth(prevMonthDate);

    let currSum = 0;
    let prevSum = 0;
    const catSums: Record<string, number> = {};

    pastExpenses.forEach(exp => {
      const expDate = new Date(exp.date);
      const amt = Number(exp.amount || 0);
      if (expDate >= currStart && expDate <= currEnd) {
        currSum += amt;
        const catKey = exp.category || 'other';
        catSums[catKey] = (catSums[catKey] || 0) + amt;
      } else if (expDate >= prevStart && expDate <= prevEnd) {
        prevSum += amt;
      }
    });

    let diff = 0;
    if (prevSum > 0) {
      diff = Math.round(((currSum - prevSum) / prevSum) * 100);
    }

    // Identify top spending category this month
    let topCatKey = '';
    let topCatAmount = 0;
    Object.entries(catSums).forEach(([cat, sum]) => {
      if (sum > topCatAmount) {
        topCatAmount = sum;
        topCatKey = cat;
      }
    });

    return {
      currentMonthTotal: currSum,
      lastMonthTotal: prevSum,
      monthDiffPercentage: diff,
      topCategoryStat: topCatKey && currSum > 0 ? {
        categoryKey: topCatKey,
        amount: topCatAmount,
        percentage: Math.round((topCatAmount / currSum) * 100)
      } : null,
    };
  }, [pastExpenses]);

  // Smart Daily Spending Velocity & Safe-to-Spend Run-rate
  const dailyRunRate = useMemo(() => {
    const now = new Date();
    const totalDays = getDaysInMonth(now);
    const passedDays = getDate(now);
    const daysRemaining = Math.max(1, totalDays - passedDays + 1);

    const totalMonthlyBudget = budgets
      .filter(b => b.period === 'monthly' || !b.period)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const hasBudget = totalMonthlyBudget > 0;
    const remainingBudget = Math.max(0, totalMonthlyBudget - currentMonthTotal);
    const safeDailySpend = hasBudget ? Math.round(remainingBudget / daysRemaining) : Math.round(currentMonthTotal / Math.max(1, passedDays));
    const budgetUsedPct = hasBudget ? Math.min(100, Math.round((currentMonthTotal / totalMonthlyBudget) * 100)) : 0;

    return {
      hasBudget,
      totalMonthlyBudget,
      remainingBudget,
      safeDailySpend,
      daysRemaining,
      passedDays,
      budgetUsedPct,
    };
  }, [budgets, currentMonthTotal]);

  // Pending Dues & Receivables Summary
  const pendingDebtsSummary = useMemo(() => {
    let duesTotal = 0;
    let duesCount = 0;
    let receivablesTotal = 0;
    let receivablesCount = 0;

    debts.forEach(d => {
      if (d.status === 'pending') {
        const amt = Number(d.amount || 0);
        if (d.type === 'due') {
          duesTotal += amt;
          duesCount += 1;
        } else {
          receivablesTotal += amt;
          receivablesCount += 1;
        }
      }
    });

    return {
      duesTotal,
      duesCount,
      receivablesTotal,
      receivablesCount,
      hasPending: duesCount > 0 || receivablesCount > 0,
    };
  }, [debts]);

  // Compute frequent & quick access expenses
  const allQuickExpenses = useMemo(() => {
    if (!pastExpenses || pastExpenses.length === 0) return [];

    const frequencyMap: Record<string, { count: number; lastExpense: Expense; lastDate: string }> = {};

    pastExpenses.forEach((exp) => {
      const title = (exp.items || '').trim();
      const categoryObj = findCategory(categories, exp.category);
      const displayKey = (title || categoryObj?.name || exp.category || 'Expense').toLowerCase();

      if (!frequencyMap[displayKey]) {
        frequencyMap[displayKey] = { count: 1, lastExpense: exp, lastDate: exp.date };
      } else {
        frequencyMap[displayKey].count += 1;
        if (new Date(exp.date) >= new Date(frequencyMap[displayKey].lastDate)) {
          frequencyMap[displayKey].lastExpense = exp;
          frequencyMap[displayKey].lastDate = exp.date;
        }
      }
    });

    return Object.values(frequencyMap).sort((a, b) => {
      const dateDiff = new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.count - a.count;
    });
  }, [pastExpenses, categories]);

  const top3QuickExpenses = useMemo(() => allQuickExpenses.slice(0, 3), [allQuickExpenses]);

  const filteredMoreList = useMemo(() => {
    const q = moreSearchQuery.trim().toLowerCase();
    const list = allQuickExpenses.slice(0, 20);
    if (!q) return list;
    return list.filter((item) => {
      const title = (item.lastExpense.items || '').toLowerCase();
      const cat = findCategory(categories, item.lastExpense.category)?.name.toLowerCase() || '';
      return title.includes(q) || cat.includes(q);
    });
  }, [allQuickExpenses, moreSearchQuery, categories]);

  const handleFrequentClick = (expense: Expense) => {
    setIsMoreOpen(false);
    onOpenExpenseForm({
      items: expense.items || '',
      amount: expense.amount || '',
      category: expense.category || '',
      where: expense.where || '',
      paymentMethod: expense.paymentMethod || 'UPI',
      account: expense.account || 'SBI',
      note: expense.note || '',
    });
  };

  const getRelativeRecency = (dateStr: string) => {
    try {
      if (!dateStr) return '';
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const topCategoryObj = topCategoryStat ? findCategory(categories, topCategoryStat.categoryKey) : null;

  return (
    <div className="p-3.5 sm:p-5 max-w-4xl mx-auto space-y-5">
      {/* Material 3 Expressive Hero Surface */}
      <div className="m3-hero-surface p-5 sm:p-7 text-foreground shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {greeting}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                <Sparkles className="w-2.5 h-2.5" />
                Live Tracker
              </span>
              <InfoButton
                title="Monthly Spending Intelligence"
                description="Displays your total expenditures recorded in the current calendar month, along with real-time comparisons against the previous month and intelligent run-rate forecasts."
              />
            </div>
            <p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {currencySymbol}{currentMonthTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Total spent this month
            </p>
          </div>

          {/* M3 Month-over-Month Comparison & Add Expense Action */}
          <div className="flex items-center gap-2.5 sm:flex-col sm:items-end">
            {monthDiffPercentage !== 0 && (
              <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs ${
                monthDiffPercentage < 0
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {monthDiffPercentage < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                <span>{Math.abs(monthDiffPercentage)}% {monthDiffPercentage < 0 ? 'less' : 'more'} vs last month</span>
              </div>
            )}
            <Button
              onClick={() => onOpenExpenseForm()}
              size="sm"
              className="gap-1.5 text-xs font-bold rounded-xl shadow-md tap-spring"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Expense</span>
            </Button>
          </div>
        </div>

        {/* Hero Financial Intelligence Ribbon */}
        <div className="mt-4 pt-3.5 border-t border-primary/15 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Safe Daily Spend Indicator */}
          <div className="flex items-center justify-between gap-2 bg-background/50 rounded-xl p-2.5 border border-primary/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground">
                  {dailyRunRate.hasBudget ? (
                    <>
                      Safe Spend: <span className="text-primary font-black">{currencySymbol}{dailyRunRate.safeDailySpend}</span> / day
                    </>
                  ) : (
                    <>
                      Daily Run Rate: <span className="text-primary font-black">{currencySymbol}{dailyRunRate.safeDailySpend}</span> / day
                    </>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {dailyRunRate.daysRemaining} days left in month {dailyRunRate.hasBudget ? `• ${currencySymbol}${dailyRunRate.remainingBudget.toLocaleString()} left` : ''}
                </p>
              </div>
            </div>
            <InfoButton
              title="Safe Daily Spend Velocity"
              description="Calculates the maximum recommended daily spending limit based on your active monthly budget and the remaining days in the month to avoid overspending."
            />
          </div>

          {/* Top Category Anomaly Pill */}
          {topCategoryStat && topCategoryObj ? (
            <div className="flex items-center justify-between gap-2 bg-background/50 rounded-xl p-2.5 border border-primary/10">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  {getIconComponent(topCategoryObj.icon, 'w-4 h-4')}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">
                    Top Category: <span className="text-foreground font-black">{topCategoryObj.name}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {currencySymbol}{topCategoryStat.amount.toLocaleString()} ({topCategoryStat.percentage}% of month's expenses)
                  </p>
                </div>
              </div>
              <InfoButton
                title="Top Monthly Spending Category"
                description="Highlights which category accounted for the largest portion of your overall spending this month."
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 bg-background/50 rounded-xl p-2.5 border border-primary/10">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground">Spending on Track</p>
                  <p className="text-[11px] text-muted-foreground">Keep logging daily expenses for deep insights</p>
                </div>
              </div>
              <InfoButton
                title="Spending Health Status"
                description="Monitors your spending pace. As you log expenses, top spending patterns and anomalies will be displayed here."
              />
            </div>
          )}
        </div>
      </div>

      {/* Compact One UI 8.5 Actionable Pending Dues / Receivables Capsule */}
      {pendingDebtsSummary.hasPending && (
        <div 
          onClick={() => onTabChange('debts')}
          className="py-2 px-3.5 bg-card/85 hover:bg-card rounded-full border border-border/80 shadow-xs flex items-center justify-between gap-2.5 cursor-pointer tap-spring transition-all group backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-bold text-xs text-foreground">Dues & Receivables:</span>
              {pendingDebtsSummary.duesCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {pendingDebtsSummary.duesCount} to pay ({currencySymbol}{pendingDebtsSummary.duesTotal})
                </span>
              )}
              {pendingDebtsSummary.receivablesCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {pendingDebtsSummary.receivablesCount} to get ({currencySymbol}{pendingDebtsSummary.receivablesTotal})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary shrink-0">
            <InfoButton
              title="Dues & Receivables Summary"
              description="Quick snapshot of pending money you owe to others and money others owe to you. Tap the banner to go directly to the Dues & Receivables page to settle or add entries."
            />
            <span className="hidden sm:inline">Settle</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <StatsOverview />
      
      {/* Quick Add & Frequently Logged Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="text-base font-bold text-foreground">Quick Re-Log & Frequent</h2>
            <InfoButton
              title="Quick Re-Log & Frequent Expenses"
              description="Automatically detects and lists your most frequently logged transactions. Tap any card to instantly open the expense form with the vendor, category, amount, and account prefilled."
            />
          </div>
          {allQuickExpenses.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMoreOpen(true)}
              className="h-8 px-2.5 text-xs text-primary font-bold gap-1 hover:bg-primary/10"
            >
              <span>More ({Math.min(20, allQuickExpenses.length)})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {top3QuickExpenses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {top3QuickExpenses.map((item, idx) => {
              const exp = item.lastExpense;
              const category = findCategory(categories, exp.category);
              const colors = getCategoryColor(category?.color || 'gray');
              const displayTitle = exp.items || category?.name || 'Quick Expense';
              const recency = getRelativeRecency(item.lastDate);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFrequentClick(exp)}
                  className="p-3.5 bg-card rounded-2xl border border-border hover:border-primary/50 shadow-xs hover:shadow-md transition-all text-left flex items-center justify-between tap-spring group"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text} shadow-xs group-hover:scale-105 transition-transform`}>
                      {getIconComponent(category?.icon || 'tag', 'w-5 h-5')}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {displayTitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {category?.name || 'General'} {exp.where ? `• ${exp.where}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                      {currencySymbol}{Number(exp.amount).toFixed(0)}
                    </p>
                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.count}x
                      </span>
                      {recency && (
                        <span className="text-[9px] text-muted-foreground">
                          {recency}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <CategorySelector 
            onCategorySelect={(category) => onOpenExpenseForm(category)} 
            variant="pill"
            limit={6} 
          />
        )}
      </div>

      {/* Category Speed Launcher */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Speed Log by Category
          </span>
          <InfoButton
            title="Category Speed Launcher"
            description="Tap any category pill to instantly open the Add Expense modal with that category pre-selected."
          />
        </div>
        <CategorySelector 
          onCategorySelect={(category) => onOpenExpenseForm(category)} 
          variant="pill"
          limit={7} 
        />
      </div>

      {/* Budget Health Overview */}
      <BudgetOverview />
      
      {/* Recent Activity Stream */}
      <RecentExpenses onViewAll={() => onTabChange('expenses')} />

      {/* More Quick Access Modal (Up to 20 items) */}
      <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 z-50">
          <DialogHeader className="p-4 border-b border-border pr-11 sm:pr-4">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Frequent Expenses & Templates ({allQuickExpenses.length})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={moreSearchQuery}
                onChange={(e) => setMoreSearchQuery(e.target.value)}
                placeholder="Search templates & frequent items..."
                className="pl-9 h-9 text-xs"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[55vh] divide-y divide-border/60 p-2">
            {filteredMoreList.map((item, idx) => {
              const exp = item.lastExpense;
              const category = findCategory(categories, exp.category);
              const colors = getCategoryColor(category?.color || 'gray');
              const displayTitle = exp.items || category?.name || 'Quick Expense';
              const recency = getRelativeRecency(item.lastDate);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFrequentClick(exp)}
                  className="w-full p-2.5 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                      {getIconComponent(category?.icon || 'tag', 'w-4 h-4')}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary truncate">
                        {displayTitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {category?.name || 'General'} {exp.where ? `• ${exp.where}` : ''} • {exp.paymentMethod}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                      {currencySymbol}{Number(exp.amount).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {item.count}x used {recency ? `• ${recency}` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
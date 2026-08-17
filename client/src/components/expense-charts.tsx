import { useState, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, PiggyBank, Clock, Sparkles, Plus, Calendar, 
  ArrowUpRight, ArrowDownRight, Layers, ArrowRightLeft, DollarSign, 
  PieChart as PieIcon, BarChart2, Activity, Zap, CheckCircle2, AlertTriangle, 
  Filter, Repeat, Wallet, FileSpreadsheet, Pencil
} from 'lucide-react';
import { useExpenses } from '@/hooks/use-expenses';
import { useBudgets, useBudgetProgress } from '@/hooks/use-budgets';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { CustomChart } from '@/lib/db';
import { useSettings } from '@/hooks/use-settings';
import { findCategory, getCategoryColor } from '@/lib/categories';
import { getIconComponent } from '@/components/category-selector';
import { DateRangePicker } from './date-range-picker';
import { DateRange } from 'react-day-picker';
import { ChartRenderer } from './charts/chart-renderer';
import { CustomChartBuilder } from './charts/custom-chart-builder';
import { 
  format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear, 
  isWithinInterval, eachDayOfInterval, getDaysInMonth, getDate 
} from 'date-fns';
import { InfoButton } from './info-button';

const PALETTE = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316', 
  '#84cc16', '#a855f7', '#0ea5e9', '#e11d48'
];

export function ExpenseCharts() {
  const expenses = useExpenses();
  const budgets = useBudgets();
  const debts = useLiveQuery(() => db.debts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const customCharts = useLiveQuery(() => db.customCharts.orderBy('createdAt').toArray()) || [];
  const settings = useSettings();

  const currency = settings?.currency || '₹';

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'patterns' | 'cashflow' | 'custom'>('overview');
  const [period, setPeriod] = useState<'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'all' | 'custom'>('thisMonth');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [overviewDimension, setOverviewDimension] = useState<'category' | 'account' | 'paymentMethod'>('category');

  // Custom Chart Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<CustomChart | null>(null);

  // 1. Determine Date Interval
  const dateInterval = useMemo<{ start: Date; end: Date }>(() => {
    const now = new Date();
    switch (period) {
      case 'lastMonth': {
        const lastM = subMonths(now, 1);
        return { start: startOfMonth(lastM), end: endOfMonth(lastM) };
      }
      case 'last3Months': {
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      }
      case 'last6Months': {
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      }
      case 'thisYear': {
        return { start: startOfYear(now), end: endOfYear(now) };
      }
      case 'all': {
        return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
      }
      case 'custom': {
        const fromDate = customRange?.from ? startOfDay(customRange.from) : startOfMonth(now);
        const toDate = customRange?.to ? endOfDay(customRange.to) : (customRange?.from ? endOfDay(customRange.from) : endOfDay(now));
        if (fromDate > toDate) {
          return { start: toDate, end: fromDate };
        }
        return { start: fromDate, end: toDate };
      }
      case 'thisMonth':
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period, customRange]);

  // 2. Filtered Expenses for chosen period
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (!exp.date) return false;
      try {
        const d = parseISO(exp.date);
        return isWithinInterval(d, dateInterval);
      } catch {
        return false;
      }
    });
  }, [expenses, dateInterval]);

  // 3. Overview KPI Metrics
  const overviewStats = useMemo(() => {
    const totalSpent = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const count = filteredExpenses.length;

    // Daily Average & Projected
    const now = new Date();
    let numDays = 1;
    if (period === 'thisMonth') {
      numDays = Math.max(1, getDate(now));
    } else {
      const msDiff = dateInterval.end.getTime() - dateInterval.start.getTime();
      numDays = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)));
    }
    const dailyAvg = totalSpent / numDays;

    let projectedSpend = totalSpent;
    if (period === 'thisMonth') {
      const daysInM = getDaysInMonth(now);
      projectedSpend = dailyAvg * daysInM;
    }

    // Top Category
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount || 0);
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const topCatId = sortedCats[0]?.[0];
    const topCatAmount = sortedCats[0]?.[1] || 0;
    const topCatObj = categories.find(c => c.id === topCatId) || findCategory(categories, topCatId);
    const topCatPercent = totalSpent > 0 ? Math.round((topCatAmount / totalSpent) * 100) : 0;

    // Largest Single Expense
    const largest = [...filteredExpenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

    return {
      totalSpent,
      count,
      dailyAvg: Math.round(dailyAvg),
      projectedSpend: Math.round(projectedSpend),
      topCatObj,
      topCatAmount,
      topCatPercent,
      largest,
    };
  }, [filteredExpenses, categories, period, dateInterval]);

  // 4. Timeline Data
  const timelineData = useMemo(() => {
    try {
      if (!dateInterval.start || !dateInterval.end || dateInterval.start > dateInterval.end) {
        return [];
      }
      const dayDiff = Math.round((dateInterval.end.getTime() - dateInterval.start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff <= 62) {
        const allDays = eachDayOfInterval(dateInterval);
        const dayMap: Record<string, number> = {};

        allDays.forEach(d => {
          dayMap[format(d, 'yyyy-MM-dd')] = 0;
        });

        filteredExpenses.forEach(e => {
          if (e.date && dayMap[e.date] !== undefined) {
            dayMap[e.date] += Number(e.amount || 0);
          }
        });

        return Object.entries(dayMap).map(([dateStr, amount]) => ({
          date: dateStr,
          formatted: format(parseISO(dateStr), 'dd MMM'),
          amount,
        }));
      } else {
        const monthMap: Record<string, number> = {};
        filteredExpenses.forEach(e => {
          if (e.date) {
            try {
              const d = parseISO(e.date);
              const mKey = format(d, 'MMM yyyy');
              monthMap[mKey] = (monthMap[mKey] || 0) + Number(e.amount || 0);
            } catch {}
          }
        });
        return Object.entries(monthMap).map(([formatted, amount]) => ({
          date: formatted,
          formatted,
          amount,
        }));
      }
    } catch {
      return [];
    }
  }, [filteredExpenses, dateInterval]);

  // 5. Breakdown Distribution Data
  const breakdownData = useMemo(() => {
    const map: Record<string, number> = {};

    filteredExpenses.forEach(e => {
      let key = 'Other';
      if (overviewDimension === 'category') {
        const cat = categories.find(c => c.id === e.category) || findCategory(categories, e.category);
        key = cat?.name || e.category || 'Other';
      } else if (overviewDimension === 'paymentMethod') {
        key = e.paymentMethod || 'Other';
      } else if (overviewDimension === 'account') {
        key = e.account || 'Default Account';
      }
      map[key] = (map[key] || 0) + Number(e.amount || 0);
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categories, overviewDimension]);

  // 6. Budget vs Actual Comparison Data
  const budgetComparisonData = useMemo(() => {
    return budgets.map(b => {
      const catExpenses = filteredExpenses.filter(e => e.category === b.category);
      const spent = catExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const limit = Number(b.amount || 0);
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const isOver = spent > limit;
      const catObj = categories.find(c => c.id === b.category) || findCategory(categories, b.category);

      return {
        id: b.id,
        name: b.name || catObj?.name || b.category,
        budgetLimit: limit,
        spentAmount: spent,
        percent,
        isOver,
        remaining: Math.max(0, limit - spent),
        overAmount: Math.max(0, spent - limit),
      };
    });
  }, [budgets, filteredExpenses, categories]);

  // 7. Habit & Timing Pattern Analytics
  const patternsData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    const timeBuckets: Record<string, number> = {
      'Morning (5AM-12PM)': 0,
      'Afternoon (12PM-5PM)': 0,
      'Evening (5PM-9PM)': 0,
      'Night (9PM-5AM)': 0,
    };

    let recurringTotal = 0;
    let discretionaryTotal = 0;

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount || 0);
      
      if (exp.date) {
        try {
          const d = parseISO(exp.date);
          const dayIdx = d.getDay();
          dayTotals[dayIdx] += amt;
          dayCounts[dayIdx] += 1;
        } catch {}
      }

      const time = exp.time || '12:00';
      const [h] = time.split(':').map(Number);
      if (h >= 5 && h < 12) timeBuckets['Morning (5AM-12PM)'] += amt;
      else if (h >= 12 && h < 17) timeBuckets['Afternoon (12PM-5PM)'] += amt;
      else if (h >= 17 && h < 21) timeBuckets['Evening (5PM-9PM)'] += amt;
      else timeBuckets['Night (9PM-5AM)'] += amt;

      if (exp.isRecurring) {
        recurringTotal += amt;
      } else {
        discretionaryTotal += amt;
      }
    });

    const dayOfWeekData = days.map((dayName, idx) => ({
      name: dayName,
      amount: dayTotals[idx],
      count: dayCounts[idx],
    }));

    const timeOfDayData = Object.entries(timeBuckets).map(([slot, amount]) => ({
      name: slot,
      amount,
    }));

    const recurringVsOneOff = [
      { name: 'Recurring / Fixed', value: recurringTotal },
      { name: 'Discretionary / One-Off', value: discretionaryTotal },
    ];

    return {
      dayOfWeekData,
      timeOfDayData,
      recurringVsOneOff,
    };
  }, [filteredExpenses]);

  // 8. Cash Flow & Dues Net Position
  const cashFlowData = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const pendingDues = debts
      .filter(d => d.type === 'due' && d.status === 'pending')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const pendingReceivables = debts
      .filter(d => d.type === 'receivable' && d.status === 'pending')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const totalOutflow = totalExpenses + pendingDues;
    const netPosition = pendingReceivables - totalOutflow;

    const breakdown = [
      { name: 'Expenses Paid', value: totalExpenses, fill: '#ef4444' },
      { name: 'Pending Dues (Owe)', value: pendingDues, fill: '#f59e0b' },
      { name: 'Receivables (Incoming)', value: pendingReceivables, fill: '#10b981' },
    ];

    return {
      totalExpenses,
      pendingDues,
      pendingReceivables,
      totalOutflow,
      netPosition,
      breakdown,
    };
  }, [filteredExpenses, debts]);

  // Custom Chart Actions
  const handleCreateCustomChart = () => {
    setEditingChart(null);
    setIsBuilderOpen(true);
  };

  const handleEditCustomChart = (chart: CustomChart) => {
    setEditingChart(chart);
    setIsBuilderOpen(true);
  };

  const handleDeleteCustomChart = async (chartId: string) => {
    if (confirm('Are you sure you want to delete this custom chart?')) {
      await db.customCharts.delete(chartId);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl shadow-xs border border-border">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>Financial Analytics & Insights</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Explore spending trends, track budgets, patterns, and custom charts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-xs font-bold rounded-full bg-card/80 border-border">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="last3Months">Last 3 Months</SelectItem>
              <SelectItem value="last6Months">Last 6 Months</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsBuilderOpen(true)}
            size="sm"
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-full shadow-md tap-spring"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Custom Chart</span>
            <span className="sm:hidden">Chart</span>
          </Button>
        </div>
      </div>

      {period === 'custom' && (
        <div className="p-3 bg-card/90 rounded-2xl border border-border shadow-xs backdrop-blur-xl">
          <DateRangePicker date={customRange} onDateChange={setCustomRange} />
        </div>
      )}

      {/* Main Tab Navigation Bar & Separate Custom Studio Pill */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Core 4 Overview Tabs */}
        <div className="flex-1 flex items-center gap-1.5 p-1 bg-muted/80 rounded-full border border-border text-xs overflow-x-auto no-scrollbar pill-scroller backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold transition-all shrink-0 tap-spring ${
              activeTab === 'overview'
                ? 'bg-card text-primary shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Overview Pulse</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('budget')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold transition-all shrink-0 tap-spring ${
              activeTab === 'budget'
                ? 'bg-card text-primary shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            <span>Budget vs Actual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patterns')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold transition-all shrink-0 tap-spring ${
              activeTab === 'patterns'
                ? 'bg-card text-primary shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Habit & Timing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cashflow')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold transition-all shrink-0 tap-spring ${
              activeTab === 'cashflow'
                ? 'bg-card text-primary shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Cash Flow & Dues</span>
          </button>
        </div>

        {/* Dedicated My Custom Studio Pill with Mixed Pen & Plus Icon */}
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`h-10 px-4 rounded-full border flex items-center justify-center gap-2 font-bold text-xs transition-all shrink-0 tap-spring ${
            activeTab === 'custom'
              ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25 scale-[1.02]'
              : 'bg-card hover:bg-muted/70 border-border text-foreground'
          }`}
          title="User Defined Custom Studio"
        >
          <div className="flex items-center -space-x-1">
            <Pencil className="w-3.5 h-3.5" />
            <Plus className="w-3 h-3 text-amber-400 stroke-[3]" />
          </div>
          <span>Custom Studio</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
            activeTab === 'custom' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
          }`}>
            {customCharts.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW PULSE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Key Insight KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="m3-card bg-card border-border shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                    Total Spent
                  </p>
                  <InfoButton
                    title="Total Spending"
                    description="Sum of all expenses recorded within the currently selected date period."
                    align="start"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {currency}{overviewStats.totalSpent.toLocaleString()}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Across {overviewStats.count} transactions
                </p>
              </CardContent>
            </Card>

            <Card className="m3-card bg-card border-border shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                    Daily Burn Rate
                  </p>
                  <InfoButton
                    title="Daily Burn Rate"
                    description="Average amount spent per calendar day in the selected time interval."
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {currency}{overviewStats.dailyAvg.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground">/day</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Average daily spending
                </p>
              </CardContent>
            </Card>

            <Card className="m3-card bg-card border-border shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                    Top Category
                  </p>
                  <InfoButton
                    title="Top Spending Category"
                    description="The category responsible for the highest portion of your total outflow in this period."
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">
                  {overviewStats.topCatObj?.name || 'None'}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {currency}{overviewStats.topCatAmount.toLocaleString()} ({overviewStats.topCatPercent}% of total)
                </p>
              </CardContent>
            </Card>

            <Card className="m3-card bg-card border-border shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                    {period === 'thisMonth' ? 'Projected Month Spend' : 'Highest Single Expense'}
                  </p>
                  <InfoButton
                    title={period === 'thisMonth' ? 'Projected Month Spend' : 'Highest Single Expense'}
                    description={period === 'thisMonth' 
                      ? 'Forecasted total spend at month end if your current daily spending pace continues.' 
                      : 'The single largest transaction recorded in this date range.'}
                    align="end"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-primary mt-1">
                  {period === 'thisMonth' 
                    ? `${currency}${overviewStats.projectedSpend.toLocaleString()}`
                    : (overviewStats.largest ? `${currency}${Number(overviewStats.largest.amount).toLocaleString()}` : `${currency}0`)}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {period === 'thisMonth' ? 'Forecast at current run-rate' : (overviewStats.largest?.items || 'No expenses')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Spending Timeline Area Chart */}
          <Card className="m3-card bg-card border-border shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base font-bold text-foreground">
                      Spending Over Time
                    </CardTitle>
                    <InfoButton
                      title="Spending Timeline"
                      description="Visual progression showing day-by-day fluctuations and spikes in your expenses."
                    />
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Daily spending progression during the selected window
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={0} debounce={50}>
                  <AreaChart data={timelineData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="formatted" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency}${v}`} />
                    <Tooltip 
                      formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Spent']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#overviewGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  No expenses in this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdown Distribution (Category / Account / Payment Method) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="m3-card bg-card border-border shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-base font-bold text-foreground">
                        Distribution Share
                      </CardTitle>
                      <InfoButton
                        title="Distribution Share"
                        description="Proportional breakdown showing where your money went across categories, payment methods, or bank accounts."
                      />
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                      Proportions by chosen dimension
                    </CardDescription>
                  </div>
                  <Select value={overviewDimension} onValueChange={(val: any) => setOverviewDimension(val)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs font-semibold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">By Category</SelectItem>
                      <SelectItem value="paymentMethod">By Method</SelectItem>
                      <SelectItem value="account">By Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                {breakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={270} minWidth={0} minHeight={0} debounce={50}>
                    <PieChart>
                      <Pie
                        data={breakdownData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="50%"
                        outerRadius="75%"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {breakdownData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Amount']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    No data to display
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ranking Bar Chart */}
            <Card className="m3-card bg-card border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-foreground capitalize">
                  Top {overviewDimension.replace(/([A-Z])/g, ' $1')}s by Spend
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Ranked highest to lowest
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                {breakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={270} minWidth={0} minHeight={0} debounce={50}>
                    <BarChart data={breakdownData.slice(0, 7)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency}${v}`} />
                      <Tooltip 
                        formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Spent']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {breakdownData.slice(0, 7).map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    No data to display
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BUDGET VS ACTUAL */}
      {/* ========================================================================= */}
      {activeTab === 'budget' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="m3-card bg-card border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">
                Budget Limit vs Actual Spending
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Side-by-side comparison of planned limits against actual expenses in this period
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {budgetComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                  <BarChart data={budgetComparisonData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency}${v}`} />
                    <Tooltip 
                      formatter={(val: any, name: string) => [
                        `${currency}${Number(val).toLocaleString()}`, 
                        name === 'budgetLimit' ? 'Budget Limit' : 'Actual Spent'
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="budgetLimit" name="Budget Limit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spentAmount" name="Actual Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                  <PiggyBank className="w-10 h-10 text-muted-foreground mb-2" />
                  <p className="font-semibold text-sm">No active budgets found</p>
                  <p className="text-xs text-muted-foreground mt-1">Create monthly or weekly budgets in the Budget tab to track performance here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Health Table */}
          {budgetComparisonData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetComparisonData.map((b, idx) => (
                <Card key={idx} className="m3-card bg-card border-border shadow-xs">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-foreground">{b.name}</h4>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        b.isOver 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {b.percent}% used
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${b.isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, b.percent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Spent: <strong className="text-foreground">{currency}{b.spentAmount.toLocaleString()}</strong></span>
                      <span>Limit: <strong>{currency}{b.budgetLimit.toLocaleString()}</strong></span>
                      <span>
                        {b.isOver ? (
                          <strong className="text-rose-500">+{currency}{b.overAmount.toLocaleString()} over</strong>
                        ) : (
                          <strong className="text-emerald-600 dark:text-emerald-400">{currency}{b.remaining.toLocaleString()} left</strong>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HABIT & TIMING PATTERNS */}
      {/* ========================================================================= */}
      {activeTab === 'patterns' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day of Week Heatmap */}
            <Card className="m3-card bg-card border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Day-of-Week Spending Pattern</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Which days of the week do you spend the most?
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={0} debounce={50}>
                  <BarChart data={patternsData.dayOfWeekData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency}${v}`} />
                    <Tooltip 
                      formatter={(val: any, _, item: any) => [
                        `${currency}${Number(val).toLocaleString()} (${item.payload.count} times)`, 
                        'Spent'
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                      {patternsData.dayOfWeekData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time of Day Peak Hours */}
            <Card className="m3-card bg-card border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Time-of-Day Spending Slots</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Morning, Afternoon, Evening vs Night spending habits
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={0} debounce={50}>
                  <BarChart data={patternsData.timeOfDayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency}${v}`} />
                    <Tooltip 
                      formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Spent']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                      {patternsData.timeOfDayData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PALETTE[(idx + 2) % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recurring vs Discretionary */}
          <Card className="m3-card bg-card border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                <span>Recurring / Fixed vs Discretionary Spending</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Understand how much of your budget is locked into subscriptions and fixed bills
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-1 space-y-4">
                  <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
                    <p className="text-xs font-bold text-primary">Recurring / Fixed</p>
                    <h4 className="text-xl font-black text-foreground mt-0.5">
                      {currency}{patternsData.recurringVsOneOff[0].value.toLocaleString()}
                    </h4>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Discretionary / One-Off</p>
                    <h4 className="text-xl font-black text-foreground mt-0.5">
                      {currency}{patternsData.recurringVsOneOff[1].value.toLocaleString()}
                    </h4>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0} debounce={50}>
                    <PieChart>
                      <Pie
                        data={patternsData.recurringVsOneOff}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="50%"
                        outerRadius="75%"
                        paddingAngle={4}
                        stroke="none"
                      >
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#3b82f6" />
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Amount']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CASH FLOW & DUES */}
      {/* ========================================================================= */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="m3-card bg-card border-border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                  Total Expenses Paid
                </p>
                <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {currency}{cashFlowData.totalExpenses.toLocaleString()}
                </h3>
              </CardContent>
            </Card>

            <Card className="m3-card bg-card border-border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                  Pending Dues (To Pay)
                </p>
                <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {currency}{cashFlowData.pendingDues.toLocaleString()}
                </h3>
              </CardContent>
            </Card>

            <Card className="m3-card bg-card border-border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                  Receivables (To Collect)
                </p>
                <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {currency}{cashFlowData.pendingReceivables.toLocaleString()}
                </h3>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Comparison Bar Chart */}
          <Card className="m3-card bg-card border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">
                Cash Flow Overview & Net Position
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Visual balance between outgoing money (Expenses + Dues) and incoming money (Receivables)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0} debounce={50}>
                <BarChart data={cashFlowData.breakdown} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency}${v}`} />
                  <Tooltip 
                    formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Amount']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {cashFlowData.breakdown.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MY CUSTOM STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 'custom' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                My Custom Analytics Dashboard
              </h3>
              <p className="text-xs text-muted-foreground">
                User-defined charts saved in your local database
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCreateCustomChart}
              className="h-8 text-xs font-bold gap-1 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Chart</span>
            </Button>
          </div>

          {customCharts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-card rounded-2xl border border-dashed border-border">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-sm text-foreground">No Custom Charts Yet</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Create personalized charts with your chosen dimensions (categories, payment methods, time slots), custom date ranges, and chart types.
              </p>
              <Button
                size="sm"
                onClick={handleCreateCustomChart}
                className="mt-4 h-9 text-xs font-bold gap-1.5 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Build Your First Chart</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {customCharts.map(chart => (
                <ChartRenderer
                  key={chart.id}
                  chart={chart}
                  expenses={expenses}
                  categories={categories}
                  currency={currency}
                  onEdit={handleEditCustomChart}
                  onDelete={handleDeleteCustomChart}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Chart Builder Dialog */}
      <CustomChartBuilder
        open={isBuilderOpen}
        onOpenChange={setIsBuilderOpen}
        editingChart={editingChart}
      />
    </div>
  );
}

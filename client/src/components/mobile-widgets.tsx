import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { DebtRecord } from '@/lib/db';
import { Expense } from '@shared/schema';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, Sparkles, Wallet, ArrowLeftRight, TrendingDown, TrendingUp,
  Clock, Coffee, Utensils, Fuel, ShoppingBag, Bus, Plus, Check,
  Share2, ShieldCheck, Flame, PieChart, Calculator, Smartphone,
  Layers, Sliders, ChevronRight, Copy, CheckCircle2, RotateCcw,
  Maximize2, Minimize2, X, Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isToday } from 'date-fns';
import { getCategoryColor } from '@/lib/categories';
import { getIconComponent } from '@/components/category-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export type GlassTheme = 'frosted' | 'neon' | 'obsidian' | 'aurora' | 'rose' | 'crystal';

export const GLASS_THEMES: GlassTheme[] = ['frosted', 'neon', 'obsidian', 'aurora', 'rose', 'crystal'];

export const WIDGET_CATALOG = [
  { id: 'speed-bar', name: '1-Tap Speed Logger Bar', category: 'quick' },
  { id: 'cash-position', name: 'Net Cash Position Glass Card', category: 'dues' },
  { id: 'budget-health', name: 'Monthly Budget Health Ring', category: 'budget' },
  { id: 'dues-matrix', name: 'Dues & Receivables Matrix', category: 'dues' },
  { id: 'spending-pulse', name: 'Spending Pulse & Top Categories', category: 'analytics' },
  { id: 'streak-tracker', name: 'Financial Habit Streak Tracker', category: 'analytics' },
  { id: 'fx-converter', name: 'FX & Currency Quick Converter', category: 'quick' },
  { id: 'monthly-horizon', name: 'Monthly Horizon Mini Calendar', category: 'budget' },
  { id: 'budget-capsule', name: 'Compact Budget Capsule', category: 'budget' },
  { id: 'activity-feed', name: 'Recent Activity Live Feed', category: 'quick' },
];

interface MobileWidgetsProps {
  onOpenExpenseForm?: (expenseOrCategory?: any) => void;
  onTabChange?: (tab: string) => void;
  standaloneWidgetId?: string | null;
}

export function MobileWidgetsStudio({ onOpenExpenseForm, onTabChange, standaloneWidgetId }: MobileWidgetsProps) {
  const { toast } = useToast();
  const settings = useSettings();
  const { isDarkTheme } = useTheme();
  const currencySymbol = settings?.currency || '₹';

  const expenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const debts = useLiveQuery(() => db.debts.toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [glassTheme, setGlassTheme] = useState<GlassTheme>('frosted');
  const [blurIntensity, setBlurIntensity] = useState(24);
  const [glassOpacity, setGlassOpacity] = useState(75);
  const [activeWidgetCategory, setActiveWidgetCategory] = useState<'all' | 'quick' | 'budget' | 'dues' | 'analytics'>('all');
  const [previewModalWidget, setPreviewModalWidget] = useState<string | null>(standaloneWidgetId || null);
  const [isFloatingDockActive, setIsFloatingDockActive] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick Currency Calc State
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcRate, setCalcRate] = useState('83.5');

  // Compute Live Metrics for Widgets
  const todayTotal = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return expenses
      .filter(e => e.date === todayStr)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const { monthSpent, monthBudget, budgetPercent, remainingBudget, dailyBurnLimit } = useMemo(() => {
    const now = new Date();
    const currStart = startOfMonth(now);
    const currEnd = endOfMonth(now);
    const daysInMonth = currEnd.getDate();
    const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);

    const spent = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d >= currStart && d <= currEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount || 0), 0) || 25000;
    const remaining = Math.max(0, totalBudget - spent);
    const pct = totalBudget > 0 ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0;
    const burnLimit = Math.round(remaining / daysLeft);

    return {
      monthSpent: spent,
      monthBudget: totalBudget,
      budgetPercent: pct,
      remainingBudget: remaining,
      dailyBurnLimit: burnLimit,
    };
  }, [expenses, budgets]);

  const { totalDues, totalReceivables, netPosition } = useMemo(() => {
    const pending = debts.filter(d => d.status === 'pending');
    const dues = pending.filter(d => d.type === 'due').reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const recv = pending.filter(d => d.type === 'receivable').reduce((sum, d) => sum + Number(d.amount || 0), 0);
    return {
      totalDues: dues,
      totalReceivables: recv,
      netPosition: recv - dues,
    };
  }, [debts]);

  const topCategories = useMemo(() => {
    const catSums: Record<string, number> = {};
    expenses.forEach(e => {
      const k = e.category || 'other';
      catSums[k] = (catSums[k] || 0) + Number(e.amount || 0);
    });
    return Object.entries(catSums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([catKey, amount]) => ({
        catKey,
        amount,
        percent: monthSpent > 0 ? Math.round((amount / monthSpent) * 100) : 0,
      }));
  }, [expenses, monthSpent]);

  // Quick 1-Tap Action Handler
  const handleQuickLog = async (item: string, amount: number, category: string, paymentMethod = 'UPI') => {
    try {
      const now = new Date();
      await db.expenses.add({
        id: `exp-widget-${Date.now()}`,
        userId: '1',
        amount,
        items: item,
        category,
        paymentMethod,
        account: 'Primary Account',
        where: 'Quick Log Widget',
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm'),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as any);

      toast({
        title: `Logged ${currencySymbol}${amount} for ${item}`,
        description: 'Successfully saved via Glass Quick-Log Widget.',
      });
    } catch (err) {
      console.error('Quick log failed:', err);
    }
  };

  const copyWidgetUrl = (widgetId: string) => {
    const url = `${window.location.origin}/?widget=${widgetId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({
      title: 'Widget Link Copied!',
      description: 'You can pin this direct widget link to your mobile home screen.',
    });
  };

  // Glass Theme CSS Class Builder
  const getGlassStyle = () => {
    const opacityVal = glassOpacity / 100;
    switch (glassTheme) {
      case 'neon':
        return 'widget-glass-neon border-primary/40 text-foreground';
      case 'obsidian':
        return 'widget-glass-obsidian border-zinc-700/50 text-white';
      case 'aurora':
        return 'widget-glass-aurora border-emerald-500/40 text-foreground';
      case 'rose':
        return 'bg-gradient-to-br from-rose-500/20 via-pink-500/15 to-purple-500/20 backdrop-blur-2xl border border-rose-500/30 text-foreground shadow-lg shadow-rose-500/10';
      case 'crystal':
        return 'bg-white/40 dark:bg-white/10 backdrop-blur-3xl border border-white/50 dark:border-white/20 text-foreground shadow-2xl';
      case 'frosted':
      default:
        return 'widget-glass-card border-border text-foreground';
    }
  };

  return (
    <div className="space-y-6 px-3 sm:px-6 py-4 max-w-5xl mx-auto pb-24">
      {/* Studio Header & Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/25 shadow-xl">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/20 text-primary">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Next-Gen PWA Experience
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Mobile Glass Widget Studio
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Overwhelming variety of ultra-sleek glassmorphic widgets. Live instant speed-loggers, 
            budget health gauges, net cash position, dues matrices, routine predictors, and floating docks.
          </p>

          {/* Quick Customizer Bar */}
          <div className="pt-3 flex items-center gap-2 flex-wrap">
            <div className="flex bg-muted/80 p-1 rounded-full border border-border backdrop-blur-md">
              {(['frosted', 'neon', 'obsidian', 'aurora', 'rose', 'crystal'] as GlassTheme[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setGlassTheme(t)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full capitalize transition-all tap-spring ${
                    glassTheme === t
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant={isFloatingDockActive ? 'default' : 'outline'}
              onClick={() => setIsFloatingDockActive(!isFloatingDockActive)}
              className="h-8 text-xs font-bold rounded-full gap-1.5 tap-spring"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isFloatingDockActive ? 'Floating Dock: ON' : 'Enable Floating Dock'}</span>
            </Button>
          </div>
        </div>

        {/* Ambient Gradient Glow Background */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'All 10+ Widgets', icon: Layers },
          { id: 'quick', label: '1-Tap Speed Loggers', icon: Zap },
          { id: 'budget', label: 'Budget & Burn Rate', icon: Wallet },
          { id: 'dues', label: 'Dues & Cash Flow', icon: ArrowLeftRight },
          { id: 'analytics', label: 'Pulse & Streaks', icon: PieChart },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveWidgetCategory(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all tap-spring ${
                activeWidgetCategory === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          WIDGETS GRID
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* WIDGET 1: 1-Tap Instant Speed Logger */}
        {(activeWidgetCategory === 'all' || activeWidgetCategory === 'quick') && (
          <div className={`p-5 rounded-3xl ${getGlassStyle()} transition-all shadow-lg space-y-4 group relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-500">
                  <Zap className="w-4 h-4 fill-amber-500/20" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-foreground">SpeedBar 1-Tap Logger</h4>
                  <p className="text-[10px] text-muted-foreground">Instant 1-tap micro transaction logging</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-primary"
                onClick={() => copyWidgetUrl('speed-log')}
                title="Pin Widget"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Chai / Coffee', amt: 20, icon: Coffee, cat: 'food' },
                { name: 'Lunch Meal', amt: 150, icon: Utensils, cat: 'food' },
                { name: 'Groceries', amt: 300, icon: ShoppingBag, cat: 'groceries' },
                { name: 'Fuel / Petrol', amt: 200, icon: Fuel, cat: 'transport' },
                { name: 'Metro / Cab', amt: 60, icon: Bus, cat: 'transport' },
                { name: 'Snacks / Bites', amt: 80, icon: Sparkles, cat: 'entertainment' },
              ].map(q => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.name}
                    type="button"
                    onClick={() => handleQuickLog(q.name, q.amt, q.cat)}
                    className="p-3 rounded-2xl bg-card/60 hover:bg-card border border-border/80 text-left transition-all tap-spring flex flex-col justify-between hover:scale-[1.02] shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-black text-primary">{currencySymbol}{q.amt}</span>
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-2 truncate block">
                      {q.name}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/40">
              <span>Today's Total: <strong className="text-foreground font-bold">{currencySymbol}{todayTotal.toFixed(2)}</strong></span>
              <button 
                type="button" 
                onClick={() => onOpenExpenseForm && onOpenExpenseForm()} 
                className="text-primary font-extrabold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Custom Log
              </button>
            </div>
          </div>
        )}

        {/* WIDGET 2: Budget Health Ring & Burn Rate */}
        {(activeWidgetCategory === 'all' || activeWidgetCategory === 'budget') && (
          <div className={`p-5 rounded-3xl ${getGlassStyle()} transition-all shadow-lg space-y-4 relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-500">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-foreground">Budget Health & Burn Rate</h4>
                  <p className="text-[10px] text-muted-foreground">Radial progress & daily allowance</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-primary"
                onClick={() => copyWidgetUrl('budget-ring')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {/* Radial Progress Ring */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted/60 stroke-current"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${budgetPercent > 90 ? 'text-rose-500' : budgetPercent > 70 ? 'text-amber-500' : 'text-emerald-500'} stroke-current transition-all duration-1000`}
                    strokeDasharray={`${budgetPercent}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-foreground">{budgetPercent}%</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-bold">Used</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Remaining:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {currencySymbol}{remainingBudget.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Daily Burn Limit:</span>
                  <span className="font-bold text-foreground">
                    {currencySymbol}{dailyBurnLimit.toLocaleString()}/day
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card/50 border border-border text-[10px] font-bold flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    budgetPercent > 90 ? 'bg-rose-500/20 text-rose-600' : budgetPercent > 70 ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'
                  }`}>
                    {budgetPercent > 90 ? 'Over Limit' : budgetPercent > 70 ? 'Tight' : 'Comfortable'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 3: Net Cash Position Pill */}
        {(activeWidgetCategory === 'all' || activeWidgetCategory === 'dues') && (
          <div className={`p-5 rounded-3xl ${getGlassStyle()} transition-all shadow-lg space-y-4 relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-blue-500/20 text-blue-500">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-foreground">Net Cash Position</h4>
                  <p className="text-[10px] text-muted-foreground">Pending dues vs receivables</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-primary"
                onClick={() => copyWidgetUrl('net-position')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 border border-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Overall Net Balance
              </span>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${
                  netPosition >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {netPosition >= 0 ? '+' : ''}{currencySymbol}{netPosition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  netPosition >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
                }`}>
                  {netPosition >= 0 ? 'Net Receivable' : 'Net Due'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">You Owe</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{currencySymbol}{totalDues.toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Owed to You</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{currencySymbol}{totalReceivables.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 4: Category Spending Pulse */}
        {(activeWidgetCategory === 'all' || activeWidgetCategory === 'analytics') && (
          <div className={`p-5 rounded-3xl ${getGlassStyle()} transition-all shadow-lg space-y-4 relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-500">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-foreground">Spending Pulse (Top 3)</h4>
                  <p className="text-[10px] text-muted-foreground">Dominant category distributions</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-primary"
                onClick={() => copyWidgetUrl('category-pulse')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {topCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No spending data recorded yet.</p>
              ) : (
                topCategories.map(c => {
                  const catObj = categories.find(cat => cat.id === c.catKey);
                  return (
                    <div key={c.catKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="capitalize text-foreground">{catObj?.name || c.catKey}</span>
                        <span className="text-muted-foreground">{currencySymbol}{c.amount.toFixed(0)} ({c.percent}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, c.percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* WIDGET 5: Spending Streak & Financial Habit Tracker */}
        {(activeWidgetCategory === 'all' || activeWidgetCategory === 'analytics') && (
          <div className={`p-5 rounded-3xl ${getGlassStyle()} transition-all shadow-lg space-y-4 relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-orange-500/20 text-orange-500">
                  <Flame className="w-4 h-4 fill-orange-500/20" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-foreground">Budget Streak & Cadence</h4>
                  <p className="text-[10px] text-muted-foreground">Consecutive disciplined days</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-primary"
                onClick={() => copyWidgetUrl('streak')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-card/60 border border-border">
              <div>
                <span className="text-3xl font-black text-amber-500 flex items-center gap-1">
                  7 <span className="text-sm text-foreground font-bold">Days Streak</span>
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Staying under daily burn target</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">+14% Saved</span>
                <span className="text-[9px] text-muted-foreground">vs last cycle</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <div key={day} className="flex-1 text-center space-y-1">
                  <span className="text-[9px] text-muted-foreground block">{day}</span>
                  <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold ${
                    idx < 5 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {idx < 5 ? <Check className="w-3 h-3 stroke-[3]" /> : '·'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WIDGET 6: Quick Currency Converter & Calculator */}
        {(activeWidgetCategory === 'all' || activeWidgetCategory === 'quick') && (
          <div className={`p-5 rounded-3xl ${getGlassStyle()} transition-all shadow-lg space-y-4 relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-teal-500/20 text-teal-500">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-foreground">Rapid FX & Currency Tool</h4>
                  <p className="text-[10px] text-muted-foreground">Instant on-the-go conversion</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-primary"
                onClick={() => copyWidgetUrl('fx-calc')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground">Base Amount ({currencySymbol})</span>
                <Input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-card border-border text-foreground font-bold"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground">Rate Multiplier</span>
                <Input
                  type="number"
                  value={calcRate}
                  onChange={(e) => setCalcRate(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-card border-border text-foreground font-bold"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-card/60 border border-border flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Converted:</span>
              <span className="text-lg font-black text-primary">
                ${((Number(calcAmount) || 0) / (Number(calcRate) || 1)).toFixed(2)} USD
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Floating In-App Dock Simulation */}
      {isFloatingDockActive && (
        <div className="fixed bottom-20 right-4 z-50 animate-in zoom-in-75 duration-200">
          <div className="p-3 rounded-full bg-primary/95 text-primary-foreground shadow-2xl backdrop-blur-xl border border-white/20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickLog('Coffee', 20, 'food')}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center tap-spring"
              title="Log Coffee ₹20"
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleQuickLog('Meal', 150, 'food')}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center tap-spring"
              title="Log Meal ₹150"
            >
              <Utensils className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenExpenseForm && onOpenExpenseForm()}
              className="w-9 h-9 rounded-full bg-white text-primary flex items-center justify-center tap-spring font-bold"
              title="Add Custom"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => setIsFloatingDockActive(false)}
              className="w-7 h-7 rounded-full text-white/70 hover:text-white flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Homescreen Pin Guide */}
      <Card className="rounded-3xl border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            How to add widgets to your Mobile Home Screen
          </CardTitle>
          <CardDescription className="text-xs">
            Turn Pocket Ledger widgets and quick loggers into 1-tap app icons on your phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              🤖 Android (Chrome / Edge / PWA)
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Tap the 3 dots in the top-right corner of Chrome &rarr; Select <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>. Long press the installed icon to access instant shortcuts!
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              🍏 iPhone & iPad (Safari)
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Tap the <strong>Share</strong> button (box with arrow) at the bottom &rarr; Scroll down and tap <strong>"Add to Home Screen"</strong>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

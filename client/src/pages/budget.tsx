import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, PiggyBank, Pencil, Trash2, PauseCircle, PlayCircle, 
  AlertTriangle, CheckCircle, Sparkles, TrendingUp, Calendar, Zap, ArrowUpRight 
} from 'lucide-react';
import { useBudgets, useBudgetProgress, useAddBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/use-budgets';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { useSettings } from '@/hooks/use-settings';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { CategorySelector, getIconComponent } from '@/components/category-selector';
import { getCategoryColor, findCategory } from '@/lib/categories';
import { Budget as BudgetType } from '@shared/schema';

export function Budget() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);
  const [deleteConfirmBudget, setDeleteConfirmBudget] = useState<BudgetType | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'monthly' | 'weekly' | 'yearly'>('monthly');

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('groceries');
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const budgets = useBudgets();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const settings = useSettings();

  const addBudgetMutation = useAddBudget();
  const updateBudgetMutation = useUpdateBudget();
  const deleteBudgetMutation = useDeleteBudget();
  
  const currencySymbol = settings?.currency || '₹';

  const openCreateDialog = () => {
    setEditingBudget(null);
    setName('Monthly Groceries');
    setAmount('5000');
    setCategory(categories[0]?.id || 'groceries');
    setPeriod('monthly');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setIsFormOpen(true);
  };

  const openEditDialog = (budget: BudgetType) => {
    setEditingBudget(budget);
    setName(budget.name);
    setAmount(budget.amount.toString());
    setCategory(budget.category);
    setPeriod(budget.period as any);
    setStartDate(budget.startDate);
    setIsFormOpen(true);
  };

  const handleCategorySelect = (catId: string) => {
    setCategory(catId);
    if (!editingBudget) {
      const catObj = categories.find(c => c.id === catId);
      if (catObj) {
        setName(`${period.charAt(0).toUpperCase() + period.slice(1)} ${catObj.name}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || Number(amount) <= 0 || !category) return;

    if (editingBudget) {
      await updateBudgetMutation.mutateAsync({
        ...editingBudget,
        name: name.trim(),
        amount: Number(amount),
        category,
        period,
        startDate,
      });
    } else {
      await addBudgetMutation.mutateAsync({
        name: name.trim(),
        amount: Number(amount),
        category,
        period,
        startDate,
        isActive: true,
      });
    }
    setIsFormOpen(false);
  };

  const toggleActiveStatus = async (budget: BudgetType) => {
    await updateBudgetMutation.mutateAsync({
      ...budget,
      isActive: !budget.isActive,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmBudget) return;
    await deleteDeleteBudget(deleteConfirmBudget.id);
  };

  const deleteDeleteBudget = async (id: string) => {
    await deleteBudgetMutation.mutateAsync(id);
    setDeleteConfirmBudget(null);
  };

  // Filtered Budgets List
  const filteredBudgets = useMemo(() => {
    if (periodFilter === 'all') return budgets;
    return budgets.filter(b => b.period === periodFilter);
  }, [budgets, periodFilter]);

  // Overall Budget Health Analytics for current month
  const overallMonthlyAnalytics = useMemo(() => {
    const monthlyBudgets = budgets.filter(b => b.isActive !== false && b.period === 'monthly');
    const totalAllocated = monthlyBudgets.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const activeCategoryIds = new Set(monthlyBudgets.map(b => b.category));
    
    // Total spent across budgeted categories
    const totalSpent = pastExpenses
      .filter(exp => {
        if (!exp.date) return false;
        try {
          const expDate = parseISO(exp.date);
          return expDate >= mStart && expDate <= mEnd && activeCategoryIds.has(exp.category);
        } catch {
          return false;
        }
      })
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    const remaining = Math.max(0, totalAllocated - totalSpent);
    const percentage = totalAllocated > 0 ? Math.min(100, (totalSpent / totalAllocated) * 100) : 0;
    const isOver = totalSpent > totalAllocated;

    return {
      totalAllocated,
      totalSpent,
      remaining,
      percentage,
      isOver,
      budgetCount: monthlyBudgets.length,
    };
  }, [budgets, pastExpenses]);

  // Smart suggestions for unbudgeted top categories
  const suggestedBudgets = useMemo(() => {
    const budgetedCats = new Set(budgets.map(b => b.category));
    const catSpendMap: Record<string, number> = {};

    const now = new Date();
    const mStart = startOfMonth(now);

    pastExpenses.forEach(exp => {
      if (!exp.category || budgetedCats.has(exp.category)) return;
      try {
        const d = parseISO(exp.date);
        if (d >= mStart) {
          catSpendMap[exp.category] = (catSpendMap[exp.category] || 0) + Number(exp.amount || 0);
        }
      } catch {}
    });

    return Object.entries(catSpendMap)
      .map(([catId, spent]) => ({
        catId,
        suggestedAmount: Math.ceil((spent * 1.15) / 500) * 500 || 1000,
        currentSpent: spent,
      }))
      .slice(0, 2);
  }, [budgets, pastExpenses]);

  return (
    <div className="p-4 space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-primary" />
            <span>Budget Planner</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set spending limits, track allowances, and stay within targets
          </p>
        </div>
        
        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 font-bold gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Budget</span>
        </Button>
      </div>

      {/* Overall Monthly Health Overview */}
      {overallMonthlyAnalytics.budgetCount > 0 && (
        <Card className="overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-850">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Monthly Budget Health ({overallMonthlyAnalytics.budgetCount} Active)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    {currencySymbol}{overallMonthlyAnalytics.totalSpent.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    of {currencySymbol}{overallMonthlyAnalytics.totalAllocated.toFixed(2)} limit
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                    overallMonthlyAnalytics.isOver
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      : overallMonthlyAnalytics.percentage > 75
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                  }`}
                >
                  {overallMonthlyAnalytics.isOver ? (
                    <><AlertTriangle className="w-3.5 h-3.5" /> Over Budget</>
                  ) : (
                    <><CheckCircle className="w-3.5 h-3.5" /> {overallMonthlyAnalytics.remaining.toFixed(0)} Left</>
                  )}
                </span>
              </div>
            </div>

            {/* Dynamic Health Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <Progress
                value={overallMonthlyAnalytics.percentage}
                className={`h-3 rounded-full ${
                  overallMonthlyAnalytics.isOver
                    ? '[&>div]:bg-red-500'
                    : overallMonthlyAnalytics.percentage > 75
                    ? '[&>div]:bg-amber-500'
                    : '[&>div]:bg-green-500'
                }`}
              />
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{Math.round(overallMonthlyAnalytics.percentage)}% utilized</span>
                <span>{format(startOfMonth(new Date()), 'MMM d')} - {format(endOfMonth(new Date()), 'MMM d')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Budget Recommendations */}
      {suggestedBudgets.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended for you based on current spending</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedBudgets.map(({ catId, suggestedAmount, currentSpent }) => {
              const cat = categories.find(c => c.id === catId);
              const colors = getCategoryColor(cat?.color || 'gray');
              return (
                <div
                  key={catId}
                  className="p-3.5 bg-card border border-border rounded-2xl shadow-xs flex items-center justify-between hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                      {getIconComponent(cat?.icon || 'tag', 'w-4 h-4')}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-foreground truncate">{cat?.name}</p>
                      <p className="text-xs text-muted-foreground">Spent {currencySymbol}{currentSpent.toFixed(0)} this month</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingBudget(null);
                      setName(`Monthly ${cat?.name}`);
                      setAmount(suggestedAmount.toString());
                      setCategory(catId);
                      setPeriod('monthly');
                      setStartDate(format(new Date(), 'yyyy-MM-dd'));
                      setIsFormOpen(true);
                    }}
                    className="h-8 text-xs font-semibold gap-1 text-primary hover:bg-primary/5 rounded-xl"
                  >
                    <span>Set {currencySymbol}{suggestedAmount}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Period Filter Tabs (One UI 8.5 Floating Capsule) */}
      <div className="flex bg-muted/80 rounded-full p-1 max-w-md border border-border backdrop-blur-xl">
        {(['monthly', 'weekly', 'yearly', 'all'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setPeriodFilter(tab)}
            className={`flex-1 py-1.5 px-3 rounded-full font-bold text-xs capitalize transition-all tap-spring ${
              periodFilter === tab
                ? 'bg-card shadow-xs text-foreground ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'all' ? 'All Periods' : tab}
          </button>
        ))}
      </div>

      {/* Budgets List */}
      {filteredBudgets.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border text-muted-foreground space-y-4">
          <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <div>
            <h3 className="font-bold text-base text-foreground">No budgets created yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Create a budget to monitor spending limits and receive alerts when nearing your target.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="font-bold text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create First Budget</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBudgets.map(budget => (
            <BudgetCardItem
              key={budget.id}
              budget={budget}
              currencySymbol={currencySymbol}
              onEdit={openEditDialog}
              onToggleActive={toggleActiveStatus}
              onDelete={setDeleteConfirmBudget}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Budget Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 z-50">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-primary" />
              <span>{editingBudget ? 'Edit Budget' : 'Create New Budget'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Budget Name <span className="text-red-500">*</span></Label>
              <Input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Monthly Groceries, Dining Out"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Budget Amount <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">{currencySymbol}</span>
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 font-bold text-base"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Category <span className="text-red-500">*</span></Label>
              <div className="mt-1">
                <CategorySelector selectedCategory={category} onCategorySelect={handleCategorySelect} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Period <span className="text-red-500">*</span></Label>
                <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Start Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="mt-1 text-sm dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold">
                {editingBudget ? 'Update Budget' : 'Save Budget'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmBudget && (
        <Dialog open={Boolean(deleteConfirmBudget)} onOpenChange={() => setDeleteConfirmBudget(null)}>
          <DialogContent className="sm:max-w-sm z-[70] p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Delete Budget?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to remove the budget for "{deleteConfirmBudget.name}"? Past transactions won't be deleted.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-5">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmBudget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================================
// Single Budget Card Item Component
// ============================================================================
function BudgetCardItem({
  budget,
  currencySymbol,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  budget: BudgetType;
  currencySymbol: string;
  onEdit: (b: BudgetType) => void;
  onToggleActive: (b: BudgetType) => void;
  onDelete: (b: BudgetType) => void;
}) {
  const progress = useBudgetProgress(budget);
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const category = findCategory(categories, budget.category);
  const colors = getCategoryColor(category?.color || 'gray');

  return (
    <Card className={`overflow-hidden transition-all border shadow-xs hover:shadow-md ${
      budget.isActive ? 'border-gray-200 dark:border-gray-800' : 'opacity-60 bg-gray-50/50 dark:bg-gray-850/40'
    }`}>
      <CardContent className="p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text} shadow-xs`}>
              {getIconComponent(category?.icon || 'tag', 'w-5 h-5')}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {budget.name}
                </p>
                {!budget.isActive && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full uppercase">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate capitalize mt-0.5">
                {budget.period} • {category?.name || 'Category'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleActive(budget)}
              title={budget.isActive ? 'Pause budget' : 'Resume budget'}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {budget.isActive ? <PauseCircle className="w-4 h-4 text-amber-500" /> : <PlayCircle className="w-4 h-4 text-green-500" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(budget)}
              title="Edit budget"
              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(budget)}
              title="Delete budget"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar & Spending Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Spent: <strong className="text-gray-900 dark:text-gray-100">{currencySymbol}{progress.spent.toFixed(2)}</strong>
            </span>
            <span className="font-semibold text-muted-foreground">
              Limit: <strong className="text-gray-900 dark:text-gray-100">{currencySymbol}{Number(budget.amount).toFixed(2)}</strong>
            </span>
          </div>

          <Progress
            value={progress.percentage}
            className={`h-2.5 rounded-full ${
              progress.isOverBudget
                ? '[&>div]:bg-red-500'
                : progress.percentage > 75
                ? '[&>div]:bg-amber-500'
                : '[&>div]:bg-green-500'
            }`}
          />

          <div className="flex justify-between items-center text-[11px] text-muted-foreground">
            <span className={`font-bold ${progress.isOverBudget ? 'text-red-600 dark:text-red-400' : ''}`}>
              {progress.isOverBudget ? (
                `⚠️ Over by ${currencySymbol}${progress.overAmount.toFixed(2)}`
              ) : (
                `${currencySymbol}${progress.remaining.toFixed(2)} remaining (${Math.round(progress.rawPercentage)}% used)`
              )}
            </span>
            <span>{progress.transactionCount} txn{progress.transactionCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

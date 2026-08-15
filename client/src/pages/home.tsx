import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { StatsOverview } from '@/components/stats-overview';
import { RecentExpenses } from '@/components/recent-expenses';
import { BudgetOverview } from '@/components/budget-overview';
import { getCategoryColor, findCategory } from '@/lib/categories';
import { getIconComponent, CategorySelector } from '@/components/category-selector';
import { useSettings } from '@/hooks/use-settings';
import { Zap, Plus, ChevronRight, Sparkles, MoreHorizontal, Search, Clock } from 'lucide-react';
import { Expense } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface HomeProps {
  onTabChange: (tab: string) => void;
  onOpenExpenseForm: (expenseOrCategory?: any) => void;
}

export function Home({ onTabChange, onOpenExpenseForm }: HomeProps) {
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useSettings();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [moreSearchQuery, setMoreSearchQuery] = useState('');

  const currencySymbol = settings?.currency || '₹';

  // Compute quick-access expenses: Sorted by Date (most recent first) then Count
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

    // Sort by Date first (most recent), then frequency count
    return Object.values(frequencyMap).sort((a, b) => {
      const dateDiff = new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.count - a.count;
    });
  }, [pastExpenses, categories]);

  const top3QuickExpenses = useMemo(() => allQuickExpenses.slice(0, 3), [allQuickExpenses]);

  const filteredMoreList = useMemo(() => {
    const q = moreSearchQuery.trim().toLowerCase();
    const list = allQuickExpenses.slice(0, 15);
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
      amount: expense.amount || 0,
      category: expense.category || '',
      where: expense.where || '',
      paymentMethod: expense.paymentMethod || 'UPI',
      account: expense.account || 'ICICI',
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

  return (
    <div className="p-4 space-y-6">
      <StatsOverview />
      
      {/* Quick Add Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quick Add</h2>
          </div>
          {allQuickExpenses.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMoreOpen(true)}
              className="h-8 px-2.5 text-xs text-primary font-semibold gap-1 hover:bg-primary/10"
            >
              <span>More ({Math.min(15, allQuickExpenses.length)})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {top3QuickExpenses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  className="group relative p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-200 text-left flex items-center justify-between hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text} shadow-sm group-hover:scale-105 transition-transform`}>
                      {getIconComponent(category?.icon || 'tag', 'w-5 h-5')}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                        {displayTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {category?.name || 'General'} {exp.where ? `• ${exp.where}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-sm text-red-600 dark:text-red-400">
                      {currencySymbol}{Number(exp.amount).toFixed(2)}
                    </p>
                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.count}x
                      </span>
                      {recency && (
                        <span className="text-[9px] text-muted-foreground font-medium">
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
          /* Fallback when there are no past transactions yet */
          <CategorySelector 
            onCategorySelect={(category) => onOpenExpenseForm(category)} 
            variant="pill"
            limit={4} 
          />
        )}
      </div>

      <BudgetOverview />
      
      <RecentExpenses onViewAll={() => onTabChange('expenses')} />

      {/* More Quick Access Modal (Up to 15 items) */}
      <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-4 z-50">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Quick Access Templates ({allQuickExpenses.length})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={moreSearchQuery}
              onChange={(e) => setMoreSearchQuery(e.target.value)}
              placeholder="Search quick access items..."
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[55vh] divide-y divide-gray-100 dark:divide-gray-800 pr-1">
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
                  className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                      {getIconComponent(category?.icon || 'tag', 'w-4 h-4')}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary truncate">
                        {displayTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {category?.name || 'General'} {exp.where ? `• ${exp.where}` : ''} • {exp.paymentMethod}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-sm text-red-600 dark:text-red-400">
                      {currencySymbol}{Number(exp.amount).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
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
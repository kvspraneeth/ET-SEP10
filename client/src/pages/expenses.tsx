import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, Pencil, Trash2, ChevronDown, ChevronUp, FileText, RotateCcw } from 'lucide-react';
import { getCategoryColor, findCategory } from '@/lib/categories';
import { getIconComponent } from '@/components/category-selector';
import { useToast } from '@/hooks/use-toast';
import { Expense } from '@shared/schema';

interface ExpensesProps {
  onOpenExpenseForm: (expense?: Expense | string) => void;
}

function ExpenseItemCard({ expense, category, onEdit, onReuse, onDelete, currencySymbol }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = getCategoryColor(category?.color || 'gray');

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2.5 rounded-full shrink-0 ${colors.bg} ${colors.text}`}>
            {getIconComponent(category?.icon || 'tag', "w-4 h-4")}
          </div>
          <div className="overflow-hidden">
            <p className="font-medium truncate text-sm sm:text-base">
              {expense.items || 'Unnamed Expense'}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {category?.name || 'Uncategorized'} • {expense.paymentMethod}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <div className="text-right mr-2">
            <p className="font-semibold text-sm sm:text-base">
              {currencySymbol}{Number(expense.amount).toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Reuse transaction"
              className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={(e) => { 
                e.stopPropagation(); 
                onReuse({
                  items: expense.items || '',
                  amount: expense.amount || 0,
                  category: expense.category || '',
                  where: expense.where || '',
                  paymentMethod: expense.paymentMethod || 'UPI',
                  account: expense.account || 'ICICI',
                  note: expense.note || '',
                }); 
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Edit expense"
              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Delete expense"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 text-sm bg-gray-50 dark:bg-gray-800/40 border-t dark:border-gray-800/60 text-muted-foreground animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Date & Time: </span>
              {format(parseISO(expense.date), 'MMM d, yyyy')} at {expense.time}
            </div>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Account: </span>
              {expense.account || 'Not specified'}
            </div>
            {expense.where && (
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Location: </span>
                {expense.where}
              </div>
            )}
            {expense.note && (
              <div className="sm:col-span-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Notes: </span>
                <span className="italic">"{expense.note}"</span>
              </div>
            )}
            {expense.attachments && expense.attachments.length > 0 && (
              <div className="sm:col-span-2 mt-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Attachments ({expense.attachments.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {expense.attachments.map((att: string, i: number) => {
                    const isPdf = att.startsWith('data:application/pdf');
                    return isPdf ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => window.open(att, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-gray-700 text-xs font-semibold text-primary hover:bg-primary/5"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View PDF {i + 1}</span>
                      </button>
                    ) : (
                      <button
                        key={i}
                        type="button"
                        onClick={() => window.open(att, '_blank')}
                        className="relative w-14 h-14 rounded-lg overflow-hidden border hover:opacity-90"
                      >
                        <img src={att} alt={`receipt-${i}`} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Interactive Fast-Scroller Component for PC/Web
// ============================================================================
function FastScroller({ sortedDates }: { sortedDates: string[] }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentPreviewDate, setCurrentPreviewDate] = useState<string>('');
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Sync with window scroll
  const handleScroll = useCallback(() => {
    if (isDragging) return;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
      setScrollProgress(0);
      return;
    }
    const currentProgress = Math.min(1, Math.max(0, window.scrollY / docHeight));
    setScrollProgress(currentProgress);

    // Estimate active date based on scroll position
    if (sortedDates.length > 0) {
      const idx = Math.min(sortedDates.length - 1, Math.floor(currentProgress * sortedDates.length));
      try {
        const d = parseISO(sortedDates[idx]);
        setCurrentPreviewDate(format(d, 'MMM yyyy'));
      } catch {
        setCurrentPreviewDate(sortedDates[idx]);
      }
    }
  }, [isDragging, sortedDates]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to relative position
  const scrollToRelative = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = Math.min(rect.height, Math.max(0, clientY - rect.top));
    const progress = relativeY / rect.height;
    setScrollProgress(progress);

    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const targetScroll = progress * docHeight;
    window.scrollTo({ top: targetScroll, behavior: 'auto' });

    if (sortedDates.length > 0) {
      const idx = Math.min(sortedDates.length - 1, Math.floor(progress * sortedDates.length));
      try {
        const d = parseISO(sortedDates[idx]);
        setCurrentPreviewDate(format(d, 'MMMM yyyy'));
      } catch {
        setCurrentPreviewDate(sortedDates[idx]);
      }
    }
  }, [sortedDates]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    scrollToRelative(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    scrollToRelative(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  if (sortedDates.length <= 1) return null;

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed right-1 sm:right-3 top-24 bottom-24 w-6 z-30 select-none cursor-pointer touch-none pointer-events-auto"
      title="Drag to scroll expenses"
    >
      {/* Floating Smart Thumb (No harsh line) */}
      <div
        style={{
          top: `calc(${scrollProgress * 100}% - ${scrollProgress * 28}px)`,
        }}
        className={`absolute right-1 w-2.5 h-7 rounded-full shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing ${
          isDragging
            ? 'w-3.5 h-9 bg-primary shadow-md scale-110 opacity-100'
            : isHovered
            ? 'w-3 h-8 bg-primary shadow-sm opacity-90'
            : 'bg-primary/30 dark:bg-primary/40 hover:bg-primary/60 opacity-60'
        }`}
      >
        {/* Floating Bubble Tooltip */}
        {(isDragging || isHovered) && currentPreviewDate && (
          <div className="absolute right-7 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-gray-900/95 dark:bg-gray-800 text-white text-[11px] font-bold shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 border border-gray-700/50">
            {currentPreviewDate}
          </div>
        )}
      </div>
    </div>
  );
}

export function Expenses({ onOpenExpenseForm }: ExpensesProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Dexie DB Live Queries
  const expenses = useLiveQuery(() => 
    db.expenses
      .orderBy('date')
      .reverse()
      .toArray()
  ) || [];

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get('default'));
  const currencySymbol = settings?.currency || '₹';

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await db.expenses.delete(id);
        toast({ title: 'Expense deleted successfully' });
      } catch (err) {
        toast({ title: 'Failed to delete expense', variant: 'destructive' });
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setCategoryFilter('ALL');
    setPaymentMethodFilter('ALL');
    setAccountFilter('ALL');
  };

  const uniquePaymentMethods = Array.from(new Set([
    'UPI', 'Cash', 'Card', 
    ...expenses.map(e => e.paymentMethod).filter(Boolean)
  ]));
  
  const uniqueAccounts = Array.from(new Set([
    'ICICI', 'HDFC', 'SBI', 
    ...expenses.map(e => (e as any).account).filter(Boolean)
  ]));

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (expense.items && expense.items.toLowerCase().includes(searchLower)) || 
        (expense.note && expense.note.toLowerCase().includes(searchLower)) ||
        (expense.where && expense.where.toLowerCase().includes(searchLower));
      
      const expenseDate = expense.date.split('T')[0];
      const matchesDate = (!dateFrom || expenseDate >= dateFrom) && (!dateTo || expenseDate <= dateTo);
      const matchesCategory = categoryFilter === 'ALL' || expense.category === categoryFilter;
      const matchesPayment = paymentMethodFilter === 'ALL' || expense.paymentMethod === paymentMethodFilter;
      const matchesAccount = accountFilter === 'ALL' || (expense as any).account === accountFilter;

      return matchesSearch && matchesDate && matchesCategory && matchesPayment && matchesAccount;
    });
  }, [expenses, searchTerm, dateFrom, dateTo, categoryFilter, paymentMethodFilter, accountFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(expense => {
      const date = format(parseISO(expense.date), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(expense);
    });
    return groups;
  }, [filteredExpenses]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));
  }, [groupedExpenses]);

  // Calculate total of currently filtered expenses
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  }, [filteredExpenses]);

  const activeFilterCount = (searchTerm ? 1 : 0) + 
                            (dateFrom ? 1 : 0) + 
                            (dateTo ? 1 : 0) + 
                            (categoryFilter !== 'ALL' ? 1 : 0) + 
                            (paymentMethodFilter !== 'ALL' ? 1 : 0) + 
                            (accountFilter !== 'ALL' ? 1 : 0);

  return (
    <div className="p-4 space-y-6 pb-24 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Button 
          variant={showFilters ? "secondary" : "outline"} 
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2 relative"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && !showFilters && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded Multi-Filter Card */}
      {showFilters && (
        <Card className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Filter Transactions</h3>
            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Clear All ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title, location, or notes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">From Date</label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm dark:[color-scheme:dark]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">To Date</label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Methods</SelectItem>
                  {uniquePaymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:col-span-2 md:col-span-4">
              <label className="text-xs font-semibold text-muted-foreground">Bank Account</label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Accounts</SelectItem>
                  {uniqueAccounts.map(acc => (
                    <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Filtered Total Display */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {filteredExpenses.length} {filteredExpenses.length === 1 ? 'transaction' : 'transactions'} found
        </span>
        <span className="text-muted-foreground">
          Total: <strong className="text-foreground text-base">{currencySymbol}{filteredTotal.toFixed(2)}</strong>
        </span>
      </div>

      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-white dark:bg-gray-800/50 rounded-xl border border-dashed">
            {expenses.length === 0 ? "No expenses recorded yet." : "No expenses match your filters."}
          </div>
        ) : (
          sortedDates.map(date => {
            const dailyTotal = groupedExpenses[date].reduce((sum, exp) => sum + Number(exp.amount), 0);

            return (
              <div key={date} className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-1">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    {format(parseISO(date), 'MMMM d, yyyy')}
                  </h3>
                  <span className="font-semibold text-sm">
                    {currencySymbol}{dailyTotal.toFixed(2)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {groupedExpenses[date].map(expense => {
                    const category = findCategory(categories, expense.category);
                    return (
                      <ExpenseItemCard 
                        key={expense.id}
                        expense={expense}
                        category={category}
                        onEdit={onOpenExpenseForm}
                        onReuse={onOpenExpenseForm}
                        onDelete={handleDelete}
                        currencySymbol={currencySymbol}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Fast Scroller for Expenses */}
      <FastScroller sortedDates={sortedDates} />
    </div>
  );
}
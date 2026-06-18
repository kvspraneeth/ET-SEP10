import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, Pencil, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { getCategoryColor } from '@/lib/categories';
import { getIconComponent } from '@/components/category-selector';
import { useToast } from '@/hooks/use-toast';
import { Expense } from '@shared/schema';

interface ExpensesProps {
  onOpenExpenseForm: (expense?: Expense | string) => void;
}

function ExpenseItemCard({ expense, category, onEdit, onDelete, currencySymbol }: any) {
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
              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 pl-[3.25rem]">
            {expense.where && (
              <div><span className="font-medium text-foreground">Where:</span> {expense.where}</div>
            )}
            {expense.note && (
              <div><span className="font-medium text-foreground">Note:</span> {expense.note}</div>
            )}
            {expense.account && (
              <div><span className="font-medium text-foreground">Account:</span> {expense.account}</div>
            )}
            {expense.time && (
              <div><span className="font-medium text-foreground">Time:</span> {expense.time}</div>
            )}
            {expense.attachments?.length > 0 && (
              <div className="col-span-1 md:col-span-2">
                <span className="font-medium text-foreground">Attachments:</span>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {((expense.attachments ?? []) as string[]).map((attachment, idx) => {
                    const isPdf = attachment.startsWith('data:application/pdf');
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(attachment, '_blank');
                        }}
                        className="group flex h-24 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-border bg-white p-2 text-center transition hover:border-primary hover:bg-primary/5"
                      >
                        {isPdf ? (
                          <>
                            <FileText className="h-6 w-6 text-primary" />
                            <span className="text-xs font-medium text-foreground">Open PDF</span>
                          </>
                        ) : (
                          <img
                            src={attachment}
                            alt={`Expense attachment ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!expense.where && !expense.note && (!expense.attachments || expense.attachments.length === 0) && (
              <div className="italic">No additional details provided.</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function Expenses({ onOpenExpenseForm }: ExpensesProps) {
  const { toast } = useToast();
  
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toArray()) || [];
  
  const userCurrency = settings[0]?.currency || 'INR';
  const currencySymbol = userCurrency === 'INR' ? '₹' : userCurrency === 'USD' ? '$' : userCurrency === 'EUR' ? '€' : userCurrency === 'GBP' ? '£' : userCurrency;

  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await db.expenses.delete(id);
        toast({ title: 'Expense deleted successfully' });
      } catch (e) {
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

  // Dynamically extract unique payment methods and accounts for the filter dropdowns
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
    <div className="p-4 space-y-6 pb-24">
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

      {showFilters && (
        <Card className="border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">Filter Expenses</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-red-500 hover:text-red-600">
                    Clear All
                  </Button>
                )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search expenses by title, notes, or location..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From Date</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="dark:[color-scheme:dark]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="dark:[color-scheme:dark]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                           {getIconComponent(c.icon, "w-3 h-3")}
                           {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger><SelectValue placeholder="All Methods" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    {uniquePaymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Account</label>
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger><SelectValue placeholder="All Accounts" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Accounts</SelectItem>
                    {uniqueAccounts.map(acc => (
                      <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
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
        {Object.keys(groupedExpenses).length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-white dark:bg-gray-800/50 rounded-xl border border-dashed">
            {expenses.length === 0 ? "No expenses recorded yet." : "No expenses match your filters."}
          </div>
        ) : (
          Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a)).map(date => {
            // Calculate Daily Total
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
                  const category = categories.find(c => c.id === expense.category);
                  return (
                    <ExpenseItemCard 
                      key={expense.id}
                      expense={expense}
                      category={category}
                      onEdit={onOpenExpenseForm}
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
    </div>
  );
}
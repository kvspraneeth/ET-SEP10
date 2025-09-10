import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronUp, FileText, LucideIcon, X } from 'lucide-react';
import { useExpenses, useDeleteExpense } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor, DEFAULT_CATEGORIES } from '@/lib/categories';
import { useSettings } from '@/hooks/use-settings';
import { format, parseISO } from 'date-fns';
import { Expense } from '@shared/schema';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/date-range-picker';

interface ExpensesProps {
  onOpenExpenseForm: (payload?: string | any) => void;
}

const iconMap: Record<string, LucideIcon> = {
    'shopping-cart': Search,
    'utensils': Plus,
    'car': Edit2,
    'file-text': Trash2,
    'tv': ChevronDown,
    'heart': ChevronUp,
    'shopping-bag': FileText,
    'plane': X,
  };

export function Expenses({ onOpenExpenseForm }: ExpensesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());

  const expenses = useExpenses();
  const categories = useLiveQuery(() => db.categories.toArray(), [], DEFAULT_CATEGORIES);
  const settings = useSettings();
  const deleteExpenseMutation = useDeleteExpense();

  const currency = settings?.currency || '₹';

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || FileText;
    return <IconComponent className="w-5 h-5" />;
  };

  const toggleExpand = (expenseId: string) => {
    setExpandedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };

  const handleEditExpense = (expense: Expense) => {
    onOpenExpenseForm(expense);
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteExpenseMutation.mutateAsync(id);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      expense.items?.toLowerCase().includes(lowerCaseSearchTerm) ||
      expense.where?.toLowerCase().includes(lowerCaseSearchTerm) ||
      expense.note?.toLowerCase().includes(lowerCaseSearchTerm);

    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesPayment = paymentFilter === 'all' || expense.paymentMethod === paymentFilter;
    const matchesAccount = accountFilter === 'all' || expense.account === accountFilter;
    
    const expenseDate = parseISO(expense.date);
    const matchesDate = !dateRange || (
      expenseDate >= (dateRange.from || new Date(0)) &&
      expenseDate <= (dateRange.to || new Date())
    );

    return matchesSearch && matchesCategory && matchesPayment && matchesAccount && matchesDate;
  });

  const groupedExpenses = filteredExpenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Total: {currency}{totalAmount.toLocaleString()} ({filteredExpenses.length} transactions)
          </p>
        </div>
        <Button onClick={() => onOpenExpenseForm()} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search expenses..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Methods</SelectItem>
            <SelectItem value="UPI">UPI</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="Card">Card</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger>
                <SelectValue placeholder="Filter by account" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="ICICI">ICICI</SelectItem>
                <SelectItem value="HDFC">HDFC</SelectItem>
                <SelectItem value="SBI">SBI</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {Object.keys(groupedExpenses).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No expenses found for the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedExpenses).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()).map(([date, items]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {format(parseISO(date), 'MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((expense) => {
                  const category = categories.find(c => c.id === expense.category) || { id: expense.category, name: 'Other', icon: 'file-text', color: 'gray' };
                  const isExpanded = expandedExpenses.has(expense.id);

                  return (
                    <div key={expense.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${getCategoryColor(category.color).bg} ${getCategoryColor(category.color).text}`}>
                            {getIconComponent(category.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{expense.items || category.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {expense.where || expense.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          <p className="font-semibold text-red-600 dark:text-red-400">{`-${currency}${expense.amount.toLocaleString()}`}</p>
                          <Button variant="ghost" size="icon" onClick={() => toggleExpand(expense.id)} className="h-8 w-8 text-gray-400 hover:text-blue-500">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)} className="h-8 w-8 text-gray-400 hover:text-blue-500">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)} className="h-8 w-8 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pl-14 text-sm">
                            <p className="text-gray-500 dark:text-gray-400"><strong>Paid with:</strong> {expense.paymentMethod} ({expense.account})</p>
                          {expense.note && (
                            <p className="mt-2 text-gray-700 dark:text-gray-300"><strong>Note:</strong> {expense.note}</p>
                          )}
                          {expense.attachments && expense.attachments.length > 0 && (
                            <div className="mt-2">
                                <p className="font-medium mb-1">Receipts:</p>
                                <div className="grid grid-cols-3 gap-2">
                                {expense.attachments.map((att, i) => (
                                    <img key={i} src={att} className="w-full h-20 object-cover rounded" alt={`attachment ${i + 1}`} />
                                ))}
                                </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus } from 'lucide-react';
import { useExpenses, useDeleteExpense } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor } from '@/lib/categories';
import { useSettings } from '@/hooks/use-settings';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

interface ExpensesProps {
  onOpenExpenseForm: (selectedCategory?: string) => void;
}

export function Expenses({ onOpenExpenseForm }: ExpensesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  
  const expenses = useExpenses();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useSettings();
  const deleteExpenseMutation = useDeleteExpense();
  
  const currency = settings?.currency || '₹';

  // Filter expenses based on search and filters
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.items?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.where?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.note?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesPayment = paymentFilter === 'all' || expense.paymentMethod === paymentFilter;
    
    return matchesSearch && matchesCategory && matchesPayment;
  });

  // Group expenses by date
  const groupedExpenses = filteredExpenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {} as Record<string, typeof expenses>);

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || {
      id: categoryId,
      name: 'Other',
      icon: '📝',
      color: 'gray'
    };
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  const formatAmount = (amount: number) => {
    return `-${currency}${amount.toLocaleString()}`;
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteExpenseMutation.mutateAsync(id);
    }
  };

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Header with total */}
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Net Banking">Net Banking</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      {Object.keys(groupedExpenses).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No expenses found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {searchTerm || categoryFilter !== 'all' || paymentFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first expense to get started!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedExpenses)
            .sort(([a], [b]) => b.localeCompare(a)) // Sort by date desc
            .map(([date, dateExpenses]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{formatDate(date)}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {dateExpenses.map((expense) => {
                      const category = getCategoryInfo(expense.category);
                      const colors = getCategoryColor(category.color);
                      
                      return (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all hover:scale-[1.02]"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                              <span>{category.icon}</span>
                            </div>
                            <div>
                              <p className="font-medium">{expense.items || category.name}</p>
                              {expense.where && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{expense.where}</p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {expense.time} • {expense.paymentMethod} • {expense.account}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-red-600 dark:text-red-400">
                              {formatAmount(expense.amount)}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-xs text-gray-400 hover:text-red-500 p-1 h-auto"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );
}

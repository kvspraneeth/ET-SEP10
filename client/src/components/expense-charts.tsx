import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useExpenses } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { startOfDay, endOfDay, startOfWeek, format, parseISO, eachDayOfInterval, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from './date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const COLORS = ['#22c55e', '#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

export function ExpenseCharts() {
  const expenses = useExpenses();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const [aggregation, setAggregation] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [filterType, setFilterType] = useState<'category' | 'account' | 'paymentMethod'>('category');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();


  const now = new Date();
  let interval: { start: Date, end: Date };

  switch (aggregation) {
    case 'today':
      interval = { start: startOfDay(now), end: endOfDay(now) };
      break;
    case 'week':
      interval = { start: startOfWeek(now), end: endOfWeek(now) };
      break;
    case 'month':
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
      break;
    case 'year':
      interval = { start: startOfYear(now), end: endOfYear(now) };
      break;
    case 'custom':
      interval = { 
        start: dateRange?.from ? startOfDay(dateRange.from) : startOfDay(now),
        end: dateRange?.to ? endOfDay(dateRange.to) : (dateRange?.from ? endOfDay(dateRange.from) : endOfDay(now))
      };
      break;
    default:
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
  }

  const filteredExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate >= interval.start && expenseDate <= interval.end;
  });

  const chartData = filteredExpenses.reduce((acc, expense) => {
    const key = expense[filterType] as string;
    if (!acc[key]) {
      acc[key] = { name: key, value: 0 };
    }
    acc[key].value += expense.amount;
    return acc;
  }, {} as Record<string, { name: string, value: number }>);

  const pieData = Object.values(chartData).map(item => {
    if (filterType === 'category') {
      const category = categories.find(c => c.id === item.name);
      return { ...item, name: category?.name || 'Other' };
    }
    return item;
  });

  const barChartData = eachDayOfInterval(interval).map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayExpenses = filteredExpenses.filter(expense => expense.date === dayStr);
    const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      name: format(day, 'MMM d'),
      amount: total,
    };
  });

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visualize your spending patterns
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
            <Select value={aggregation} onValueChange={(value) => setAggregation(value as any)}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="category">By Category</SelectItem>
                    <SelectItem value="account">By Account</SelectItem>
                    <SelectItem value="paymentMethod">By Payment Method</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {aggregation === 'custom' && (
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      )}

      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base capitalize">
            {filterType.replace(/([A-Z])/g, ' $1')} Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No expenses for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            Spending Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {barChartData.some(d => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No data for selected range</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

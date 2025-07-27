import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useExpenses } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { startOfWeek, format, parseISO, eachDayOfInterval, endOfWeek } from 'date-fns';

const COLORS = ['#22c55e', '#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

export function ExpenseCharts() {
  const expenses = useExpenses();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // Category data for pie chart
  const categoryData = categories.map((category) => {
    const categoryExpenses = expenses.filter(expense => expense.category === category.id);
    const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      name: category.name,
      value: total,
      icon: category.icon,
    };
  }).filter(item => item.value > 0);

  // Daily spending data for bar chart
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dailyData = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayExpenses = expenses.filter(expense => expense.date === dayStr);
    const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      name: format(day, 'EEE'),
      amount: total,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{`${label}: ₹${payload[0].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{`${data.icon} ${data.name}: ₹${data.value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Category Pie Chart */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <span className="w-4 h-4 mr-2">📊</span>
            Spending by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No expenses to display</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Bar Chart */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <span className="w-4 h-4 mr-2">📊</span>
            Daily Spending Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Spending Locations */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <span className="w-4 h-4 mr-2">📍</span>
            Top Spending Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TopLocations expenses={expenses} />
        </CardContent>
      </Card>
    </div>
  );
}

function TopLocations({ expenses }: { expenses: any[] }) {
  const locationData = expenses
    .filter(expense => expense.where)
    .reduce((acc, expense) => {
      const location = expense.where;
      if (!acc[location]) {
        acc[location] = { total: 0, count: 0 };
      }
      acc[location].total += expense.amount;
      acc[location].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

  const topLocations = Object.entries(locationData)
    .map(([location, data]) => ({
      location,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (topLocations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No location data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topLocations.map((item, index) => (
        <div
          key={item.location}
          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <div>
            <p className="font-medium">{item.location}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.count} transaction{item.count !== 1 ? 's' : ''}
            </p>
          </div>
          <p className="font-semibold text-red-600 dark:text-red-400">
            ₹{item.total.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

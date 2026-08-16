import { useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, LineChart, Line, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Pencil, Trash2, Maximize2, MoreHorizontal, FileSpreadsheet } from 'lucide-react';
import { CustomChart, ChartType, ChartMetric, ChartGroupBy, ChartDateRange } from '@/lib/db';
import { Expense } from '@shared/schema';
import { Category } from '@shared/schema';
import { findCategory, getCategoryColor } from '@/lib/categories';
import { 
  format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear, 
  isWithinInterval 
} from 'date-fns';

const PALETTE = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316', 
  '#84cc16', '#a855f7', '#0ea5e9', '#e11d48'
];

interface ChartRendererProps {
  chart: CustomChart;
  expenses: Expense[];
  categories: Category[];
  currency?: string;
  onEdit?: (chart: CustomChart) => void;
  onDelete?: (chartId: string) => void;
  height?: number;
  showCardWrapper?: boolean;
}

export function ChartRenderer({
  chart,
  expenses,
  categories,
  currency = '₹',
  onEdit,
  onDelete,
  height = 280,
  showCardWrapper = true,
}: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  // 1. Filter expenses by date range and selected filters
  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const now = new Date();

    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (chart.dateRangeType) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'last7days':
        startDate = startOfDay(subDays(now, 7));
        break;
      case 'last30days':
        startDate = startOfDay(subDays(now, 30));
        break;
      case 'last90days':
        startDate = startOfDay(subDays(now, 90));
        break;
      case 'lastMonth':
        const lastM = subMonths(now, 1);
        startDate = startOfMonth(lastM);
        endDate = endOfMonth(lastM);
        break;
      case 'thisYear':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'custom':
        startDate = chart.customFrom ? startOfDay(parseISO(chart.customFrom)) : startOfMonth(now);
        endDate = chart.customTo ? endOfDay(parseISO(chart.customTo)) : endOfDay(now);
        break;
      case 'all':
        startDate = new Date(2000, 0, 1);
        break;
      case 'thisMonth':
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
    }

    return expenses.filter(exp => {
      if (!exp.date) return false;
      try {
        const expDate = parseISO(exp.date);
        const inRange = isWithinInterval(expDate, { start: startDate, end: endDate });
        if (!inRange) return false;
      } catch {
        return false;
      }

      // Filter by selected Categories
      if (chart.selectedCategories && chart.selectedCategories.length > 0) {
        if (!chart.selectedCategories.includes(exp.category)) return false;
      }

      // Filter by selected Accounts
      if (chart.selectedAccounts && chart.selectedAccounts.length > 0) {
        if (!chart.selectedAccounts.includes(exp.account)) return false;
      }

      // Filter by selected Payment Methods
      if (chart.selectedPaymentMethods && chart.selectedPaymentMethods.length > 0) {
        if (!chart.selectedPaymentMethods.includes(exp.paymentMethod)) return false;
      }

      return true;
    });
  }, [expenses, chart]);

  // 2. Aggregate data according to Group By and Metric
  const { chartData, totalValue, countValue, avgValue } = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return { chartData: [], totalValue: 0, countValue: 0, avgValue: 0 };
    }

    const groupMap: Record<string, { name: string; amounts: number[]; count: number }> = {};

    const getGroupName = (exp: Expense): string => {
      switch (chart.groupBy) {
        case 'category':
          const cat = findCategory(categories, exp.category);
          return cat?.name || exp.category || 'General';
        case 'account':
          return exp.account || 'Default Account';
        case 'paymentMethod':
          return exp.paymentMethod || 'UPI';
        case 'dayOfWeek': {
          try {
            const d = parseISO(exp.date);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[d.getDay()];
          } catch {
            return 'Other';
          }
        }
        case 'timeOfDay': {
          const time = exp.time || '12:00';
          const [h] = time.split(':').map(Number);
          if (h >= 5 && h < 12) return 'Morning (5AM-12PM)';
          if (h >= 12 && h < 17) return 'Afternoon (12PM-5PM)';
          if (h >= 17 && h < 21) return 'Evening (5PM-9PM)';
          return 'Night (9PM-5AM)';
        }
        case 'month': {
          try {
            const d = parseISO(exp.date);
            return format(d, 'MMM yyyy');
          } catch {
            return 'Other';
          }
        }
        case 'isRecurring':
          return exp.isRecurring ? 'Recurring / Fixed' : 'Discretionary / One-Off';
        default:
          return 'General';
      }
    };

    let totalSum = 0;

    filteredExpenses.forEach(exp => {
      const gName = getGroupName(exp);
      const amt = Number(exp.amount || 0);
      totalSum += amt;

      if (!groupMap[gName]) {
        groupMap[gName] = { name: gName, amounts: [], count: 0 };
      }
      groupMap[gName].amounts.push(amt);
      groupMap[gName].count += 1;
    });

    // Compute metrics
    const data = Object.values(groupMap).map(g => {
      const sum = g.amounts.reduce((a, b) => a + b, 0);
      let val = sum;

      if (chart.metric === 'count') {
        val = g.count;
      } else if (chart.metric === 'average') {
        val = g.count > 0 ? Math.round(sum / g.count) : 0;
      } else if (chart.metric === 'max') {
        val = g.amounts.length > 0 ? Math.max(...g.amounts) : 0;
      }

      return {
        name: g.name,
        value: val,
        rawTotal: sum,
        count: g.count,
        avg: g.count > 0 ? Math.round(sum / g.count) : 0,
      };
    });

    // Sort appropriately
    if (chart.groupBy === 'dayOfWeek') {
      const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      data.sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));
    } else if (chart.groupBy === 'timeOfDay') {
      const timeOrder = ['Morning (5AM-12PM)', 'Afternoon (12PM-5PM)', 'Evening (5PM-9PM)', 'Night (9PM-5AM)'];
      data.sort((a, b) => timeOrder.indexOf(a.name) - timeOrder.indexOf(b.name));
    } else {
      // Sort by value descending
      data.sort((a, b) => b.value - a.value);
    }

    return {
      chartData: data,
      totalValue: totalSum,
      countValue: filteredExpenses.length,
      avgValue: filteredExpenses.length > 0 ? Math.round(totalSum / filteredExpenses.length) : 0,
    };
  }, [filteredExpenses, chart, categories]);

  const metricLabel = useMemo(() => {
    switch (chart.metric) {
      case 'count': return 'Count (Transactions)';
      case 'average': return 'Average Amount';
      case 'max': return 'Highest Transaction';
      case 'total':
      default: return 'Total Spent';
    }
  }, [chart.metric]);

  const formatTooltipValue = (val: any) => {
    if (chart.metric === 'count') return `${val} transactions`;
    return `${currency}${Number(val).toLocaleString()}`;
  };

  const exportCSV = () => {
    if (chartData.length === 0) return;
    let csv = `Group,${metricLabel},Total Amount,Transaction Count,Average\n`;
    chartData.forEach(row => {
      csv += `"${row.name}",${row.value},${row.rawTotal},${row.count},${row.avg}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chart.title.replace(/\s+/g, '_')}_data.csv`;
    a.click();
  };

  const renderVisualChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-center p-4">
          <p className="text-sm font-medium">No expenses match this criteria</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting the date range or category filters</p>
        </div>
      );
    }

    switch (chart.chartType) {
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={50}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={4}
                stroke="none"
              >
                {chartData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: any) => [formatTooltipValue(val), metricLabel]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend 
                verticalAlign="bottom" 
                layout="horizontal" 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={50}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                outerRadius="80%"
                stroke="none"
              >
                {chartData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: any) => [formatTooltipValue(val), metricLabel]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend 
                verticalAlign="bottom" 
                layout="horizontal" 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'horizontal-bar':
        return (
          <ResponsiveContainer width="100%" height={Math.max(height, chartData.length * 36 + 40)} minWidth={0} minHeight={0} debounce={50}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 20, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis type="number" tickFormatter={(v) => chart.metric === 'count' ? `${v}` : `${currency}${v}`} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(val: any) => [formatTooltipValue(val), metricLabel]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={50}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => chart.metric === 'count' ? `${v}` : `${currency}${v}`} />
              <Tooltip 
                formatter={(val: any) => [formatTooltipValue(val), metricLabel]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#8b5cf6" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill={`url(#grad-${chart.id})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={50}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => chart.metric === 'count' ? `${v}` : `${currency}${v}`} />
              <Tooltip 
                formatter={(val: any) => [formatTooltipValue(val), metricLabel]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={50}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid opacity={0.3} />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              <Radar 
                name={metricLabel} 
                dataKey="value" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.5} 
              />
              <Tooltip 
                formatter={(val: any) => [formatTooltipValue(val), metricLabel]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'vertical-bar':
      case 'stacked-bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={50}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={chartData.length > 5 ? -25 : 0} textAnchor={chartData.length > 5 ? "end" : "middle"} height={chartData.length > 5 ? 50 : 30} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => chart.metric === 'count' ? `${v}` : `${currency}${v}`} />
              <Tooltip 
                formatter={(val: any) => [formatTooltipValue(val), metricLabel]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const content = (
    <div ref={chartRef} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-foreground">{currency}{totalValue.toLocaleString()}</span>
          </div>
          <div className="hidden sm:inline-block text-muted-foreground/40">•</div>
          <div>
            <span className="text-muted-foreground">Entries: </span>
            <span className="font-bold text-foreground">{countValue}</span>
          </div>
          <div className="hidden sm:inline-block text-muted-foreground/40">•</div>
          <div>
            <span className="text-muted-foreground">Avg: </span>
            <span className="font-bold text-foreground">{currency}{avgValue.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(chart)}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              title="Edit configuration"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(chart.id)}
              className="h-7 w-7 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              title="Delete chart"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="pt-2">
        {renderVisualChart()}
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <Card className="m3-card bg-card border-border shadow-xs overflow-hidden rounded-3xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              {chart.title}
            </CardTitle>
            {chart.description && (
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {chart.description}
              </CardDescription>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full shrink-0">
            {chart.groupBy} • {chart.chartType}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        {content}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Pencil, Sparkles, PieChart as PieIcon, BarChart2, 
  TrendingUp, Activity, Check, X, Layers, Filter, Eye, RefreshCw 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CustomChart, ChartType, ChartMetric, ChartGroupBy, ChartDateRange } from '@/lib/db';
import db from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChartRenderer } from './chart-renderer';
import { format } from 'date-fns';

interface CustomChartBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingChart?: CustomChart | null;
}

const CHART_TYPES: { id: ChartType; label: string; icon: any; desc: string }[] = [
  { id: 'donut', label: 'Donut Chart', icon: PieIcon, desc: 'Best for category proportions' },
  { id: 'vertical-bar', label: 'Vertical Bar', icon: BarChart2, desc: 'Great for comparing groups' },
  { id: 'horizontal-bar', label: 'Horizontal Bar', icon: BarChart2, desc: 'Easy to read long labels' },
  { id: 'area', label: 'Area Trend', icon: TrendingUp, desc: 'Smooth timeline progression' },
  { id: 'line', label: 'Line Chart', icon: Activity, desc: 'Connects data points' },
  { id: 'radar', label: 'Radar Chart', icon: Sparkles, desc: 'Multi-axis profile balance' },
  { id: 'pie', label: 'Pie Chart', icon: PieIcon, desc: 'Classic solid pie' },
];

const METRICS: { id: ChartMetric; label: string; desc: string }[] = [
  { id: 'total', label: 'Total Spending (₹)', desc: 'Sum of all expense amounts' },
  { id: 'count', label: 'Transaction Count', desc: 'Number of times logged' },
  { id: 'average', label: 'Average Amount (₹)', desc: 'Mean per transaction' },
  { id: 'max', label: 'Highest Transaction (₹)', desc: 'Largest single spend' },
];

const GROUP_BY_OPTIONS: { id: ChartGroupBy; label: string; desc: string }[] = [
  { id: 'category', label: 'By Category', desc: 'Groceries, Food, Bills, etc.' },
  { id: 'paymentMethod', label: 'By Payment Method', desc: 'UPI, Credit Card, Cash, etc.' },
  { id: 'account', label: 'By Bank Account', desc: 'HDFC, ICICI, Wallet, etc.' },
  { id: 'dayOfWeek', label: 'By Day of Week', desc: 'Monday through Sunday' },
  { id: 'timeOfDay', label: 'By Time of Day', desc: 'Morning, Afternoon, Evening, Night' },
  { id: 'month', label: 'By Month (Timeline)', desc: 'Month-over-month trend' },
  { id: 'isRecurring', label: 'Recurring vs One-Off', desc: 'Fixed vs Discretionary spend' },
];

const DATE_RANGE_OPTIONS: { id: ChartDateRange; label: string }[] = [
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'last30days', label: 'Last 30 Days' },
  { id: 'last90days', label: 'Last 90 Days' },
  { id: 'thisYear', label: 'This Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Date Range' },
];

export function CustomChartBuilder({ open, onOpenChange, editingChart }: CustomChartBuilderProps) {
  const { toast } = useToast();
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get('default'));
  const currency = settings?.currency || '₹';

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chartType, setChartType] = useState<ChartType>('donut');
  const [metric, setMetric] = useState<ChartMetric>('total');
  const [groupBy, setGroupBy] = useState<ChartGroupBy>('category');
  const [dateRangeType, setDateRangeType] = useState<ChartDateRange>('thisMonth');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-01'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Distinct Accounts and Payment Methods from past data
  const availablePaymentMethods = useMemo(() => {
    const set = new Set(['UPI', 'Card', 'Cash', 'Netbanking']);
    pastExpenses.forEach(e => { if (e.paymentMethod) set.add(e.paymentMethod); });
    return Array.from(set);
  }, [pastExpenses]);

  const availableAccounts = useMemo(() => {
    const set = new Set(['ICICI', 'HDFC', 'SBI', 'Cash', 'Wallet']);
    pastExpenses.forEach(e => { if (e.account) set.add(e.account); });
    return Array.from(set);
  }, [pastExpenses]);

  useEffect(() => {
    if (open) {
      if (editingChart) {
        setTitle(editingChart.title);
        setDescription(editingChart.description || '');
        setChartType(editingChart.chartType);
        setMetric(editingChart.metric);
        setGroupBy(editingChart.groupBy);
        setDateRangeType(editingChart.dateRangeType);
        setCustomFrom(editingChart.customFrom || format(new Date(), 'yyyy-MM-01'));
        setCustomTo(editingChart.customTo || format(new Date(), 'yyyy-MM-dd'));
        setSelectedCategories(editingChart.selectedCategories || []);
        setSelectedPaymentMethods(editingChart.selectedPaymentMethods || []);
        setSelectedAccounts(editingChart.selectedAccounts || []);
      } else {
        setTitle('Custom Spending Breakdown');
        setDescription('My personalized spending analysis');
        setChartType('donut');
        setMetric('total');
        setGroupBy('category');
        setDateRangeType('thisMonth');
        setCustomFrom(format(new Date(), 'yyyy-MM-01'));
        setCustomTo(format(new Date(), 'yyyy-MM-dd'));
        setSelectedCategories([]);
        setSelectedPaymentMethods([]);
        setSelectedAccounts([]);
      }
    }
  }, [open, editingChart]);

  // Construct chart preview object in real time
  const previewChart: CustomChart = useMemo(() => {
    return {
      id: editingChart?.id || 'preview-chart',
      title: title || 'Custom Chart Preview',
      description: description || undefined,
      chartType,
      metric,
      groupBy,
      dateRangeType,
      customFrom: dateRangeType === 'custom' ? customFrom : undefined,
      customTo: dateRangeType === 'custom' ? customTo : undefined,
      selectedCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      selectedPaymentMethods: selectedPaymentMethods.length > 0 ? selectedPaymentMethods : undefined,
      selectedAccounts: selectedAccounts.length > 0 ? selectedAccounts : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [title, description, chartType, metric, groupBy, dateRangeType, customFrom, customTo, selectedCategories, selectedPaymentMethods, selectedAccounts, editingChart]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Please enter a chart title', variant: 'destructive' });
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      if (editingChart) {
        await db.customCharts.update(editingChart.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          chartType,
          metric,
          groupBy,
          dateRangeType,
          customFrom: dateRangeType === 'custom' ? customFrom : undefined,
          customTo: dateRangeType === 'custom' ? customTo : undefined,
          selectedCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
          selectedPaymentMethods: selectedPaymentMethods.length > 0 ? selectedPaymentMethods : undefined,
          selectedAccounts: selectedAccounts.length > 0 ? selectedAccounts : undefined,
          updatedAt: nowIso,
        });
        toast({ title: 'Custom Chart Updated', description: `Saved "${title.trim()}".` });
      } else {
        const count = await db.customCharts.count();
        const newChart: CustomChart = {
          id: `chart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: title.trim(),
          description: description.trim() || undefined,
          chartType,
          metric,
          groupBy,
          dateRangeType,
          customFrom: dateRangeType === 'custom' ? customFrom : undefined,
          customTo: dateRangeType === 'custom' ? customTo : undefined,
          selectedCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
          selectedPaymentMethods: selectedPaymentMethods.length > 0 ? selectedPaymentMethods : undefined,
          selectedAccounts: selectedAccounts.length > 0 ? selectedAccounts : undefined,
          orderIndex: count,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await db.customCharts.add(newChart);
        toast({ title: 'Custom Chart Created', description: `Added "${title.trim()}" to your dashboard.` });
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving custom chart:', err);
      toast({ title: 'Failed to save chart', variant: 'destructive' });
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const togglePaymentMethod = (method: string) => {
    setSelectedPaymentMethods(prev => 
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const toggleAccount = (acc: string) => {
    setSelectedAccounts(prev => 
      prev.includes(acc) ? prev.filter(a => a !== acc) : [...prev, acc]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden z-50 rounded-3xl border border-border shadow-2xl bg-card text-foreground">
        {/* Header */}
        <div className="p-4 pr-11 sm:pr-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {editingChart ? <Pencil className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {editingChart ? 'Edit Custom Chart' : 'Create Custom Chart'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Build your own customized analytics widget with metrics and filters
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Live Preview Box */}
          <div className="bg-muted/40 p-3.5 rounded-2xl border border-dashed border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                <Eye className="w-3 h-3" />
                Live Preview
              </span>
              <span className="text-[10px] text-muted-foreground">
                Updates dynamically as you configure
              </span>
            </div>
            <ChartRenderer
              chart={previewChart}
              expenses={pastExpenses}
              categories={categories}
              currency={currency}
              height={220}
              showCardWrapper={false}
            />
          </div>

          {/* Section 1: Title & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Chart Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly Food & Cabs"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Tracking commute and meal costs"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Section 2: Chart Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Chart Visualization Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHART_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = chartType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setChartType(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4" />
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Metric and Group By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Metric to Measure</Label>
              <Select value={metric} onValueChange={(val: ChartMetric) => setMetric(val)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRICS.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="py-0.5">
                        <span className="font-medium text-xs">{m.label}</span>
                        <span className="text-[10px] text-muted-foreground block">{m.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Group By (Dimension)</Label>
              <Select value={groupBy} onValueChange={(val: ChartGroupBy) => setGroupBy(val)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_BY_OPTIONS.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="py-0.5">
                        <span className="font-medium text-xs">{g.label}</span>
                        <span className="text-[10px] text-muted-foreground block">{g.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 4: Date Range */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Time Window</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {DATE_RANGE_OPTIONS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateRangeType(d.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    dateRangeType === d.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {dateRangeType === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Granular Filters Toggle */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-xs font-bold text-primary flex items-center justify-between w-full py-1 hover:underline"
            >
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>
                  Filter Specific Categories, Accounts & Methods
                  {(selectedCategories.length > 0 || selectedAccounts.length > 0 || selectedPaymentMethods.length > 0) && (
                    <span className="ml-1.5 px-1.5 py-0.2 bg-primary/10 rounded-full text-[10px]">
                      {selectedCategories.length + selectedAccounts.length + selectedPaymentMethods.length} active
                    </span>
                  )}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {showAdvancedFilters ? 'Hide' : 'Customize'}
              </span>
            </button>

            {showAdvancedFilters && (
              <div className="space-y-4 pt-3 mt-2 bg-muted/40 p-3.5 rounded-2xl border border-border animate-in fade-in duration-200">
                {/* Categories */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">
                    Categories ({selectedCategories.length === 0 ? 'All' : `${selectedCategories.length} selected`})
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all tap-spring ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary'
                              : 'bg-card border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accounts */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">
                    Accounts ({selectedAccounts.length === 0 ? 'All' : `${selectedAccounts.length} selected`})
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableAccounts.map(acc => {
                      const isSelected = selectedAccounts.includes(acc);
                      return (
                        <button
                          key={acc}
                          type="button"
                          onClick={() => toggleAccount(acc)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all tap-spring ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary'
                              : 'bg-card border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {acc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">
                    Payment Methods ({selectedPaymentMethods.length === 0 ? 'All' : `${selectedPaymentMethods.length} selected`})
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePaymentMethods.map(pm => {
                      const isSelected = selectedPaymentMethods.includes(pm);
                      return (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => togglePaymentMethod(pm)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all tap-spring ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary'
                              : 'bg-card border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {pm}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-card flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs rounded-full font-semibold px-4"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-9 text-xs font-bold gap-1.5 shadow-md rounded-full px-5"
          >
            <Check className="w-4 h-4" />
            <span>{editingChart ? 'Save Changes' : 'Create Chart'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

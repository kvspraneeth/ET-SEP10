import { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { RecurringExpense, RecurringDebt, RecurrenceFrequency, CustomIntervalUnit, DebtRecord } from '@/lib/db';
import { 
  Plus, Pencil, MoreVertical, Trash2, PauseCircle, PlayCircle, 
  Repeat, Calendar, Clock, AlertTriangle, X, Check, ArrowRightLeft, 
  Sparkles, Building2, CreditCard, MapPin, History 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CategorySelector, getIconComponent } from './category-selector';
import { getCategoryColor, findCategory } from '@/lib/categories';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useSettings } from '@/hooks/use-settings';
import { Expense } from '@shared/schema';
import { processRecurringRules } from '@/lib/recurring-engine';
import { queryClient } from '@/lib/queryClient';

// ============================================================================
// 1. MANAGE RECURRING EXPENSES DIALOG
// ============================================================================
export function ManageRecurringExpensesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recurringList = useLiveQuery(() => db.recurringExpenses.toArray()) || [];
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useSettings();
  const { toast } = useToast();

  const currencySymbol = settings?.currency || '₹';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringExpense | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<RecurringExpense | null>(null);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [items, setItems] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [where, setWhere] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [account, setAccount] = useState<string>('SBI');
  const [note, setNote] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [customCount, setCustomCount] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<CustomIntervalUnit>('months');

  // Autocomplete UI States
  const [titleSuggestionsOpen, setTitleSuggestionsOpen] = useState(false);
  const [whereSuggestionsOpen, setWhereSuggestionsOpen] = useState(false);
  const [suggestedBanner, setSuggestedBanner] = useState<string | null>(null);

  const titleContainerRef = useRef<HTMLDivElement | null>(null);
  const whereContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (titleContainerRef.current && !titleContainerRef.current.contains(e.target as Node)) {
        setTitleSuggestionsOpen(false);
      }
      if (whereContainerRef.current && !whereContainerRef.current.contains(e.target as Node)) {
        setWhereSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Historical Title Mapping
  const historicalTitles = useMemo(() => {
    const titleMap: Record<string, { count: number; lastExpense: Expense; lastDate: string }> = {};
    pastExpenses.forEach(exp => {
      const name = (exp.items || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!titleMap[key]) {
        titleMap[key] = { count: 1, lastExpense: exp, lastDate: exp.date };
      } else {
        titleMap[key].count += 1;
        if (new Date(exp.date) >= new Date(titleMap[key].lastDate)) {
          titleMap[key].lastExpense = exp;
          titleMap[key].lastDate = exp.date;
        }
      }
    });
    return titleMap;
  }, [pastExpenses]);

  // Unique Where locations
  const historicalLocations = useMemo(() => {
    const locs = pastExpenses
      .map(e => e.where?.trim())
      .filter((loc): loc is string => Boolean(loc && loc.length > 0));
    return Array.from(new Set(locs));
  }, [pastExpenses]);

  // Filtered Title Suggestions
  const filteredTitleSuggestions = useMemo(() => {
    const query = items.trim().toLowerCase();
    const allTitles = Object.values(historicalTitles);
    if (!query) {
      return allTitles
        .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
        .slice(0, 6);
    }
    return allTitles
      .filter(item => (item.lastExpense.items || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = (a.lastExpense.items || '').toLowerCase().startsWith(query);
        const bStarts = (b.lastExpense.items || '').toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      })
      .slice(0, 6);
  }, [historicalTitles, items]);

  const filteredWhereSuggestions = useMemo(() => {
    const query = where.trim().toLowerCase();
    if (!query) return historicalLocations.slice(0, 5);
    return historicalLocations.filter(l => l.toLowerCase().includes(query)).slice(0, 5);
  }, [historicalLocations, where]);

  const applyTitleSuggestion = (selectedTitle: string, lastExpense: Expense) => {
    setItems(selectedTitle);
    setTitleSuggestionsOpen(false);
    const autoFilled = [];

    if (!category || category === '') {
      setCategory(lastExpense.category);
      autoFilled.push('Category');
    }
    if (!where && lastExpense.where) {
      setWhere(lastExpense.where);
      autoFilled.push('Where');
    }
    if (!amount || Number(amount) === 0) {
      setAmount(lastExpense.amount.toString());
      autoFilled.push('Amount');
    }
    if (lastExpense.paymentMethod) setPaymentMethod(lastExpense.paymentMethod);
    if (lastExpense.account) setAccount(lastExpense.account);

    if (autoFilled.length > 0) {
      setSuggestedBanner(`Auto-suggested ${autoFilled.join(', ')} from past expense.`);
    }
  };

  const openNewForm = () => {
    setEditingRule(null);
    setAmount('');
    setItems('');
    setCategory(categories[0]?.id || 'groceries');
    setWhere('');
    setPaymentMethod('UPI');
    setAccount('SBI');
    setNote('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
    setFrequency('monthly');
    setCustomCount(1);
    setCustomUnit('months');
    setSuggestedBanner(null);
    setIsFormOpen(true);
  };

  const openEditForm = (rule: RecurringExpense) => {
    setEditingRule(rule);
    setAmount(rule.amount.toString());
    setItems(rule.items);
    setCategory(rule.category);
    setWhere(rule.where || '');
    setPaymentMethod(rule.paymentMethod || 'UPI');
    setAccount(rule.account || 'SBI');
    setNote(rule.note || '');
    setStartDate(rule.startDate);
    setEndDate(rule.endDate || '');
    setFrequency(rule.frequency);
    setCustomCount(rule.customIntervalCount || 1);
    setCustomUnit(rule.customIntervalUnit || 'months');
    setSuggestedBanner(null);
    setOpenMenuId(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !items.trim() || !category) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const payload: RecurringExpense = {
        id: editingRule?.id || crypto.randomUUID(),
        amount: Number(amount),
        items: items.trim(),
        category,
        where: where.trim() || undefined,
        paymentMethod,
        account,
        note: note.trim() || undefined,
        startDate,
        endDate: endDate ? endDate : undefined,
        frequency,
        customIntervalCount: frequency === 'custom' ? Number(customCount) : undefined,
        customIntervalUnit: frequency === 'custom' ? customUnit : undefined,
        isActive: editingRule ? editingRule.isActive : true,
        lastGeneratedDate: editingRule?.lastGeneratedDate,
        createdAt: editingRule?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      if (editingRule) {
        await db.recurringExpenses.update(editingRule.id, payload);
        toast({ title: 'Recurring expense updated successfully' });
      } else {
        await db.recurringExpenses.add(payload);
        toast({ title: 'Recurring expense created successfully' });
      }

      // Immediately process recurring instances (including past dates)
      const { expensesAdded } = await processRecurringRules();
      if (expensesAdded > 0) {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        toast({ title: `Generated ${expensesAdded} past/current recurring expense(s)` });
      }

      setIsFormOpen(false);
    } catch (err: any) {
      toast({ title: 'Error saving recurring expense', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActiveStatus = async (rule: RecurringExpense) => {
    try {
      const newStatus = !rule.isActive;
      await db.recurringExpenses.update(rule.id, { isActive: newStatus, updatedAt: new Date().toISOString() });
      setOpenMenuId(null);
      if (newStatus) {
        await processRecurringRules();
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
      }
      toast({
        title: newStatus ? 'Recurring expense resumed' : 'Recurring expense stopped',
        description: newStatus ? 'It will automatically be logged on set dates.' : 'It will no longer generate upcoming expenses.',
      });
    } catch (err: any) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async (deleteGenerated: boolean) => {
    if (!deleteConfirmRule) return;
    try {
      if (deleteGenerated) {
        const generated = await db.expenses.where('recurringRuleId').equals(deleteConfirmRule.id).toArray();
        for (const exp of generated) {
          await db.expenses.delete(exp.id);
        }
      }
      await db.recurringExpenses.delete(deleteConfirmRule.id);
      setDeleteConfirmRule(null);
      setOpenMenuId(null);
      toast({
        title: 'Recurring expense deleted',
        description: deleteGenerated ? 'Rule and all generated transactions were removed.' : 'Recurring rule was removed.',
      });
    } catch (err: any) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getFrequencyLabel = (rule: RecurringExpense) => {
    if (rule.frequency === 'custom') {
      return `Every ${rule.customIntervalCount || 1} ${rule.customIntervalUnit || 'months'}`;
    }
    return rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-6 z-50">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Repeat className="w-5 h-5 text-primary" />
                <span>Manage Recurring Expenses</span>
              </DialogTitle>
              <Button size="sm" onClick={openNewForm} className="gap-1.5 h-8 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Recurring</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto max-h-[60vh] py-3 pr-1 space-y-3">
            {recurringList.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed text-muted-foreground space-y-3">
                <Repeat className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm">No recurring expenses set yet.</p>
                <Button size="sm" variant="outline" onClick={openNewForm} className="gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create your first recurring expense</span>
                </Button>
              </div>
            ) : (
              recurringList.map((rule) => {
                const cat = findCategory(categories, rule.category);
                const colors = getCategoryColor(cat?.color || 'gray');
                const isMenuOpen = openMenuId === rule.id;

                return (
                  <div
                    key={rule.id}
                    className={`relative p-3.5 bg-white dark:bg-gray-800 border rounded-xl shadow-xs transition-all ${
                      rule.isActive
                        ? 'border-gray-200 dark:border-gray-700'
                        : 'border-gray-200 dark:border-gray-700/60 opacity-60 bg-gray-50/60 dark:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                          {getIconComponent(cat?.icon || 'tag', 'w-5 h-5')}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                              {rule.items}
                            </p>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                                rule.isActive
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {rule.isActive ? 'Active' : 'Stopped'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {getFrequencyLabel(rule)} • {cat?.name || 'General'} {rule.where ? `• ${rule.where}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-1">
                          <p className="font-bold text-sm text-red-600 dark:text-red-400">
                            {currencySymbol}{Number(rule.amount).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Starts {rule.startDate ? format(parseISO(rule.startDate), 'MMM d, yy') : ''}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(rule)}
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit recurring expense"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : rule.id);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-9 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden text-xs py-1 animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => toggleActiveStatus(rule)}
                                className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 font-medium"
                              >
                                {rule.isActive ? (
                                  <>
                                    <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Stop Recurring</span>
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="w-3.5 h-3.5 text-green-500" />
                                    <span>Resume Recurring</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmRule(rule);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 font-medium border-t dark:border-gray-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Rule</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Recurring Expense Modal with Fuzzy Title Search */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 z-[60]">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Repeat className="w-4 h-4 text-primary" />
              <span>{editingRule ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</span>
            </DialogTitle>
          </DialogHeader>

          {suggestedBanner && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between text-xs text-primary animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{suggestedBanner}</span>
              </div>
              <button type="button" onClick={() => setSuggestedBanner(null)} className="text-primary/70 hover:text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-semibold">Amount <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 font-bold text-base"
              />
            </div>

            {/* Title with Fuzzy Search Autocomplete */}
            <div ref={titleContainerRef} className="relative">
              <Label className="text-xs font-semibold">Title / Description <span className="text-red-500">*</span></Label>
              <Input
                required
                value={items}
                onChange={(e) => {
                  setItems(e.target.value);
                  setTitleSuggestionsOpen(true);
                }}
                onFocus={() => setTitleSuggestionsOpen(true)}
                autoComplete="off"
                placeholder="e.g. WiFi Bill, Gym Membership, House Rent"
                className="mt-1"
              />
              {titleSuggestionsOpen && filteredTitleSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b text-[11px] font-semibold text-muted-foreground flex justify-between">
                    <span className="flex items-center gap-1"><History className="w-3 h-3 text-primary" /> Past Expenses</span>
                    <span>Click to auto-fill</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredTitleSuggestions.map(item => {
                      const exp = item.lastExpense;
                      const timeAgo = exp.date ? formatDistanceToNow(parseISO(exp.date), { addSuffix: true }) : '';
                      return (
                        <button
                          key={exp.items}
                          type="button"
                          onClick={() => applyTitleSuggestion(exp.items || '', exp)}
                          className="w-full text-left px-3.5 py-2 hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{exp.items}</p>
                            <p className="text-xs text-muted-foreground">{exp.category} {exp.where ? `• ${exp.where}` : ''} • ₹{exp.amount}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-medium">{item.count}x</span>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{timeAgo}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold">Category <span className="text-red-500">*</span></Label>
              <div className="mt-1">
                <CategorySelector selectedCategory={category} onCategorySelect={setCategory} />
              </div>
            </div>

            {/* Recurrence Frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Frequency <span className="text-red-500">*</span></Label>
                <Select value={frequency} onValueChange={(val: any) => setFrequency(val)}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Annually (Yearly)</SelectItem>
                    <SelectItem value="custom">Custom Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Start Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 text-sm dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Custom Interval Option */}
            {frequency === 'custom' && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                <Label className="text-xs font-semibold text-primary">Repeat Every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={customCount}
                    onChange={(e) => setCustomCount(parseInt(e.target.value) || 1)}
                    className="w-20 bg-white dark:bg-gray-800"
                  />
                  <Select value={customUnit} onValueChange={(val: any) => setCustomUnit(val)}>
                    <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Optional End Date */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">End Date (Optional)</Label>
                {endDate && (
                  <button type="button" onClick={() => setEndDate('')} className="text-[10px] text-red-500 hover:underline">
                    Clear (Repeat Forever)
                  </button>
                )}
              </div>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Forever if blank"
                className="mt-1 text-sm dark:[color-scheme:dark]"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {endDate ? `Stops recurring after ${endDate}` : 'Will recur indefinitely until stopped.'}
              </p>
            </div>

            {/* Where with Autocomplete */}
            <div ref={whereContainerRef} className="relative">
              <Label className="text-xs font-semibold">Where / Vendor (Optional)</Label>
              <Input
                value={where}
                onChange={(e) => {
                  setWhere(e.target.value);
                  setWhereSuggestionsOpen(true);
                }}
                onFocus={() => setWhereSuggestionsOpen(true)}
                autoComplete="off"
                placeholder="e.g. Landlord, Airtel, Gold's Gym"
                className="mt-1"
              />
              {whereSuggestionsOpen && filteredWhereSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                  <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredWhereSuggestions.map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setWhere(l);
                          setWhereSuggestionsOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-sm hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center justify-between"
                      >
                        <span>{l}</span>
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold">
                {editingRule ? 'Update Rule' : 'Save Recurring Rule'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Warning Modal */}
      {deleteConfirmRule && (
        <Dialog open={Boolean(deleteConfirmRule)} onOpenChange={() => setDeleteConfirmRule(null)}>
          <DialogContent className="sm:max-w-sm z-[70] p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Delete Recurring Rule?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Do you want to delete only this recurring schedule, or also delete all past expenses generated by this rule?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4 pt-3 border-t">
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDelete(true)}
                className="text-xs font-semibold"
              >
                Delete Rule & All Generated Expenses
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDelete(false)}
                className="text-xs font-semibold"
              >
                Delete Rule Only (Keep Past Records)
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmRule(null)}
                className="text-xs text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ============================================================================
// 2. MANAGE RECURRING DUES & RECEIVABLES DIALOG
// ============================================================================
export function ManageRecurringDebtsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recurringDebts = useLiveQuery(() => db.recurringDebts.toArray()) || [];
  const pastDebts = useLiveQuery(() => db.debts.toArray()) || [];
  const settings = useSettings();
  const { toast } = useToast();

  const currencySymbol = settings?.currency || '₹';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebtRule, setEditingDebtRule] = useState<RecurringDebt | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<RecurringDebt | null>(null);

  // Form State
  const [type, setType] = useState<'due' | 'receivable'>('due');
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [customCount, setCustomCount] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<CustomIntervalUnit>('months');

  // Autocomplete UI States
  const [personSuggestionsOpen, setPersonSuggestionsOpen] = useState(false);
  const [purposeSuggestionsOpen, setPurposeSuggestionsOpen] = useState(false);
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [suggestedBanner, setSuggestedBanner] = useState<string | null>(null);

  const personContainerRef = useRef<HTMLDivElement | null>(null);
  const purposeContainerRef = useRef<HTMLDivElement | null>(null);
  const locationContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personContainerRef.current && !personContainerRef.current.contains(e.target as Node)) {
        setPersonSuggestionsOpen(false);
      }
      if (purposeContainerRef.current && !purposeContainerRef.current.contains(e.target as Node)) {
        setPurposeSuggestionsOpen(false);
      }
      if (locationContainerRef.current && !locationContainerRef.current.contains(e.target as Node)) {
        setLocationSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const historicalPersons = useMemo(() => {
    const map: Record<string, { count: number; lastDebt: DebtRecord; lastDate: string }> = {};
    pastDebts.forEach(d => {
      const name = (d.personName || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const debtDate = d.datetime || d.createdAt || '';
      if (!map[key]) {
        map[key] = { count: 1, lastDebt: d, lastDate: debtDate };
      } else {
        map[key].count += 1;
        if (new Date(debtDate) >= new Date(map[key].lastDate)) {
          map[key].lastDebt = d;
          map[key].lastDate = debtDate;
        }
      }
    });
    return map;
  }, [pastDebts]);

  const historicalPurposes = useMemo(() => {
    const list = pastDebts.map(d => (d.purpose || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [pastDebts]);

  const historicalLocations = useMemo(() => {
    const list = pastDebts.map(d => (d.location || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [pastDebts]);

  const filteredPersonSuggestions = useMemo(() => {
    const q = personName.trim().toLowerCase();
    const all = Object.values(historicalPersons);
    if (!q) {
      return all
        .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
        .slice(0, 6);
    }
    return all
      .filter(item => item.lastDebt.personName.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
      .slice(0, 6);
  }, [historicalPersons, personName]);

  const filteredPurposeSuggestions = useMemo(() => {
    const q = purpose.trim().toLowerCase();
    if (!q) return historicalPurposes.slice(0, 6);
    return historicalPurposes.filter(p => p.toLowerCase().includes(q)).slice(0, 6);
  }, [historicalPurposes, purpose]);

  const filteredLocationSuggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return historicalLocations.slice(0, 5);
    return historicalLocations.filter(loc => loc.toLowerCase().includes(q)).slice(0, 5);
  }, [historicalLocations, location]);

  const applyPersonSuggestion = (name: string, lastDebt: DebtRecord) => {
    setPersonName(name);
    setPersonSuggestionsOpen(false);
    const autoFilled = [];

    if (!purpose && lastDebt.purpose) {
      setPurpose(lastDebt.purpose);
      autoFilled.push('Purpose');
    }
    if (!location && lastDebt.location) {
      setLocation(lastDebt.location);
      autoFilled.push('Where');
    }
    if (!amount && lastDebt.amount > 0) {
      setAmount(lastDebt.amount.toString());
      autoFilled.push('Amount');
    }

    if (autoFilled.length > 0) {
      setSuggestedBanner(`Auto-suggested ${autoFilled.join(', ')} from past record with ${name}.`);
    }
  };

  const openNewForm = () => {
    setEditingDebtRule(null);
    setType('due');
    setAmount('');
    setPurpose('');
    setPersonName('');
    setLocation('');
    setNotes('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
    setFrequency('monthly');
    setCustomCount(1);
    setCustomUnit('months');
    setSuggestedBanner(null);
    setIsFormOpen(true);
  };

  const openEditForm = (rule: RecurringDebt) => {
    setEditingDebtRule(rule);
    setType(rule.type);
    setAmount(rule.amount.toString());
    setPurpose(rule.purpose);
    setPersonName(rule.personName);
    setLocation(rule.location || '');
    setNotes(rule.notes || '');
    setStartDate(rule.startDate);
    setEndDate(rule.endDate || '');
    setFrequency(rule.frequency);
    setCustomCount(rule.customIntervalCount || 1);
    setCustomUnit(rule.customIntervalUnit || 'months');
    setSuggestedBanner(null);
    setOpenMenuId(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !purpose.trim() || !personName.trim()) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const payload: RecurringDebt = {
        id: editingDebtRule?.id || crypto.randomUUID(),
        type,
        amount: Number(amount),
        purpose: purpose.trim(),
        personName: personName.trim(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        startDate,
        endDate: endDate ? endDate : undefined,
        frequency,
        customIntervalCount: frequency === 'custom' ? Number(customCount) : undefined,
        customIntervalUnit: frequency === 'custom' ? customUnit : undefined,
        isActive: editingDebtRule ? editingDebtRule.isActive : true,
        lastGeneratedDate: editingDebtRule?.lastGeneratedDate,
        createdAt: editingDebtRule?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      if (editingDebtRule) {
        await db.recurringDebts.update(editingDebtRule.id, payload);
        toast({ title: 'Recurring due updated successfully' });
      } else {
        await db.recurringDebts.add(payload);
        toast({ title: 'Recurring due created successfully' });
      }

      // Immediately process recurring debt instances (including past dates)
      const { debtsAdded } = await processRecurringRules();
      if (debtsAdded > 0) {
        toast({ title: `Generated ${debtsAdded} past/current recurring due(s)` });
      }

      setIsFormOpen(false);
    } catch (err: any) {
      toast({ title: 'Error saving recurring due', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActiveStatus = async (rule: RecurringDebt) => {
    try {
      const newStatus = !rule.isActive;
      await db.recurringDebts.update(rule.id, { isActive: newStatus, updatedAt: new Date().toISOString() });
      setOpenMenuId(null);
      if (newStatus) {
        await processRecurringRules();
      }
      toast({
        title: newStatus ? 'Recurring due resumed' : 'Recurring due stopped',
      });
    } catch (err: any) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async (deleteGenerated: boolean) => {
    if (!deleteConfirmRule) return;
    try {
      if (deleteGenerated) {
        const generated = await db.debts.where('recurringRuleId').equals(deleteConfirmRule.id).toArray();
        for (const d of generated) {
          if (d.id) await db.debts.delete(d.id);
        }
      }
      await db.recurringDebts.delete(deleteConfirmRule.id);
      setDeleteConfirmRule(null);
      setOpenMenuId(null);
      toast({ title: 'Recurring due deleted' });
    } catch (err: any) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-6 z-50">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                <span>Manage Recurring Dues & Receivables</span>
              </DialogTitle>
              <Button size="sm" onClick={openNewForm} className="gap-1.5 h-8 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Recurring</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto max-h-[60vh] py-3 pr-1 space-y-3">
            {recurringDebts.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed text-muted-foreground space-y-3">
                <ArrowRightLeft className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm">No recurring dues or receivables set yet.</p>
                <Button size="sm" variant="outline" onClick={openNewForm} className="gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create recurring due/receivable</span>
                </Button>
              </div>
            ) : (
              recurringDebts.map((rule) => {
                const isDue = rule.type === 'due';
                const isMenuOpen = openMenuId === rule.id;

                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 bg-white dark:bg-gray-800 border rounded-xl shadow-xs transition-all relative ${
                      rule.isActive ? 'border-gray-200 dark:border-gray-700' : 'opacity-60 bg-gray-50 dark:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                            isDue ? 'bg-red-400' : 'bg-green-400'
                          }`}
                        >
                          {rule.personName ? rule.personName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                              {rule.personName}
                            </p>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                                isDue ? 'bg-red-100 text-red-700 dark:bg-red-950/40' : 'bg-green-100 text-green-700 dark:bg-green-950/40'
                              }`}
                            >
                              {isDue ? 'Due (To Pay)' : 'Receivable'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {rule.purpose} • {rule.frequency}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-1">
                          <p className={`font-bold text-sm ${isDue ? 'text-red-500' : 'text-green-500'}`}>
                            {isDue ? '-' : '+'}{currencySymbol}{Number(rule.amount).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Starts {rule.startDate ? format(parseISO(rule.startDate), 'MMM d') : ''}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(rule)}
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : rule.id);
                            }}
                            className="h-8 w-8 text-muted-foreground"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-9 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border z-50 text-xs py-1">
                              <button
                                type="button"
                                onClick={() => toggleActiveStatus(rule)}
                                className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 font-medium"
                              >
                                {rule.isActive ? <PauseCircle className="w-3.5 h-3.5 text-amber-500" /> : <PlayCircle className="w-3.5 h-3.5 text-green-500" />}
                                <span>{rule.isActive ? 'Stop' : 'Resume'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmRule(rule);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium border-t"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Recurring Debt Modal with Fuzzy Autocomplete */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 z-[60]">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>{editingDebtRule ? 'Edit Recurring Due' : 'New Recurring Due / Receivable'}</span>
            </DialogTitle>
          </DialogHeader>

          {suggestedBanner && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between text-xs text-primary animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{suggestedBanner}</span>
              </div>
              <button type="button" onClick={() => setSuggestedBanner(null)} className="text-primary/70 hover:text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setType('due')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  type === 'due' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'
                }`}
              >
                Due (To Pay)
              </button>
              <button
                type="button"
                onClick={() => setType('receivable')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  type === 'receivable' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'
                }`}
              >
                Receivable (To Get)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Amount <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 font-bold"
                />
              </div>

              {/* Person Name with Fuzzy Suggestions */}
              <div ref={personContainerRef} className="relative">
                <Label className="text-xs font-semibold">Person Name <span className="text-red-500">*</span></Label>
                <Input
                  required
                  value={personName}
                  onChange={(e) => {
                    setPersonName(e.target.value);
                    setPersonSuggestionsOpen(true);
                  }}
                  onFocus={() => setPersonSuggestionsOpen(true)}
                  autoComplete="off"
                  placeholder="e.g. John, Landlord"
                  className="mt-1"
                />
                {personSuggestionsOpen && filteredPersonSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                    <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredPersonSuggestions.map(item => {
                        const d = item.lastDebt;
                        return (
                          <button
                            key={d.personName}
                            type="button"
                            onClick={() => applyPersonSuggestion(d.personName, d)}
                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{d.personName}</p>
                              <p className="text-[10px] text-muted-foreground">{d.purpose} • ₹{d.amount}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{item.count}x</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Purpose with Fuzzy Suggestions */}
            <div ref={purposeContainerRef} className="relative">
              <Label className="text-xs font-semibold">Purpose <span className="text-red-500">*</span></Label>
              <Input
                required
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  setPurposeSuggestionsOpen(true);
                }}
                onFocus={() => setPurposeSuggestionsOpen(true)}
                autoComplete="off"
                placeholder="e.g. Monthly Rent, Shared WiFi"
                className="mt-1"
              />
              {purposeSuggestionsOpen && filteredPurposeSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                  <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredPurposeSuggestions.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPurpose(p);
                          setPurposeSuggestionsOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-primary/5"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Frequency</Label>
                <Select value={frequency} onValueChange={(val: any) => setFrequency(val)}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Annually</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 text-sm dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {frequency === 'custom' && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                <Label className="text-xs font-semibold text-primary">Repeat Every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={customCount}
                    onChange={(e) => setCustomCount(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Select value={customUnit} onValueChange={(val: any) => setCustomUnit(val)}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">End Date (Optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 text-sm dark:[color-scheme:dark]"
              />
            </div>

            {/* Where / Location */}
            <div ref={locationContainerRef} className="relative">
              <Label className="text-xs font-semibold">Where / Location (Optional)</Label>
              <Input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setLocationSuggestionsOpen(true);
                }}
                onFocus={() => setLocationSuggestionsOpen(true)}
                autoComplete="off"
                placeholder="e.g. Apartment, Online"
                className="mt-1"
              />
              {locationSuggestionsOpen && filteredLocationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                  <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredLocationSuggestions.map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setLocation(loc);
                          setLocationSuggestionsOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-primary/5 flex items-center justify-between"
                      >
                        <span>{loc}</span>
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

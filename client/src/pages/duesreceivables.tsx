import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { DebtRecord } from '@/lib/db';
import { 
  Plus, Filter, X, MoreVertical, Edit2, Trash2, CheckCircle2, 
  ChevronDown, ChevronUp, History, Undo, Search, Repeat, Calendar, 
  RotateCcw, Sparkles, MapPin, Clock, User, Zap, ArrowLeftRight,
  TrendingDown, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
  Check, CheckCircle
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/components/theme-provider';
import { ManageRecurringDebtsDialog } from '@/components/recurring-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, subDays, parseISO } from 'date-fns';

export default function DuesReceivables() {
  const { toast } = useToast();
  const settings = useSettings();
  const { isDarkTheme } = useTheme();
  const currencySymbol = settings?.currency || '₹';

  // Main UI States
  const [activeTab, setActiveTab] = useState<'due' | 'receivable'>('due');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<{id: number, type: 'settle' | 'unsettle' | 'delete'} | null>(null);

  // Card Interaction States
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Settled Section States
  const [showSettledSection, setShowSettledSection] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPerson, setFilterPerson] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Autocomplete UI States
  const [personSuggestionsOpen, setPersonSuggestionsOpen] = useState(false);
  const [purposeSuggestionsOpen, setPurposeSuggestionsOpen] = useState(false);
  const [suggestedBanner, setSuggestedBanner] = useState<string | null>(null);

  const personContainerRef = useRef<HTMLDivElement | null>(null);
  const purposeContainerRef = useRef<HTMLDivElement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    location: '',
    personName: '',
    notes: '',
    datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  // Fetch debts from Dexie
  const debts = useLiveQuery(() => db.debts.toArray()) || [];

  // Close suggestion dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personContainerRef.current && !personContainerRef.current.contains(e.target as Node)) {
        setPersonSuggestionsOpen(false);
      }
      if (purposeContainerRef.current && !purposeContainerRef.current.contains(e.target as Node)) {
        setPurposeSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Historical Autocomplete Data
  const historicalPersons = useMemo(() => {
    const map: Record<string, { count: number; lastDebt: DebtRecord; lastDate: string }> = {};
    debts.forEach(d => {
      const name = String(d.personName || '').trim();
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
  }, [debts]);

  const historicalPurposes = useMemo(() => {
    const list = debts.map(d => String(d.purpose || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [debts]);

  // Frequent Counterparties Recommendation Pills (Inspired by Budgets page recommendations)
  const frequentCounterparties = useMemo(() => {
    const map: Record<string, { count: number; lastDebt: DebtRecord; pendingTotal: number }> = {};
    debts.forEach(d => {
      const pName = String(d.personName || '').trim();
      if (!pName) return;
      if (!map[pName]) {
        map[pName] = { count: 1, lastDebt: d, pendingTotal: d.status === 'pending' ? Number(d.amount || 0) : 0 };
      } else {
        map[pName].count += 1;
        if (d.status === 'pending') {
          map[pName].pendingTotal += Number(d.amount || 0);
        }
      }
    });

    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([name, data]) => ({
        name,
        count: data.count,
        pendingTotal: data.pendingTotal,
        lastType: data.lastDebt.type,
      }));
  }, [debts]);

  // Handle Autocomplete selection
  const handleSelectPerson = (personName: string) => {
    const hist = historicalPersons[personName.toLowerCase()];
    if (hist && hist.lastDebt) {
      setFormData(prev => ({
        ...prev,
        personName,
        purpose: prev.purpose || hist.lastDebt.purpose || '',
        location: prev.location || hist.lastDebt.location || '',
      }));
      setSuggestedBanner(`Prefilled typical details for ${personName}`);
    } else {
      setFormData(prev => ({ ...prev, personName }));
    }
    setPersonSuggestionsOpen(false);
  };

  const handleSelectPurpose = (purpose: string) => {
    setFormData(prev => ({ ...prev, purpose }));
    setPurposeSuggestionsOpen(false);
  };

  const handleReuseDue = (due: DebtRecord) => {
    setActiveTab(due.type);
    setFormData({
      amount: due.amount.toString(),
      purpose: due.purpose,
      location: due.location || '',
      personName: due.personName,
      notes: due.notes || '',
      datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    });
    setEditId(null);
    setShowAddForm(true);
    toast({
      title: "Details Reused",
      description: `Loaded previous record for ${due.personName}.`,
    });
  };

  const saveDebt = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    if (!formData.personName.trim()) {
      toast({ title: "Error", description: "Please enter a person's name.", variant: "destructive" });
      return;
    }
    if (!formData.purpose.trim()) {
      toast({ title: "Error", description: "Please enter a purpose.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const debtPayload: Partial<DebtRecord> = {
        amount: Number(formData.amount),
        type: activeTab,
        purpose: formData.purpose,
        location: formData.location || undefined,
        personName: formData.personName,
        notes: formData.notes || undefined,
        datetime: formData.datetime || new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      if (editId) {
        await db.debts.update(editId, debtPayload);
        toast({ title: "Updated", description: "Record updated successfully." });
      } else {
        await db.debts.add(debtPayload as DebtRecord);
        toast({ title: "Saved", description: "Record saved successfully." });
      }
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const settleDebt = async (id: number) => {
    try {
      await db.debts.update(id, { status: 'settled' });
      toast({ title: "Settled", description: "Record marked as settled!" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to settle record.", variant: "destructive" });
    }
  };

  const unsettleDebt = async (id: number) => {
    try {
      await db.debts.update(id, { status: 'pending' });
      toast({ title: "Reopened", description: "Record moved back to pending." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to unsettle record.", variant: "destructive" });
    }
  };

  const deleteDebt = async (id: number) => {
    try {
      await db.debts.delete(id);
      toast({ title: "Deleted", description: "Record removed." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  // Derived Metrics & Calculations
  const pendingDebts = useMemo(() => debts.filter(d => d.status === 'pending'), [debts]);
  const settledDebts = useMemo(() => debts.filter(d => d.status === 'settled'), [debts]);

  const totalDues = useMemo(() => {
    return pendingDebts.filter(d => d.type === 'due').reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [pendingDebts]);

  const totalReceivables = useMemo(() => {
    return pendingDebts.filter(d => d.type === 'receivable').reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [pendingDebts]);

  const netBalance = useMemo(() => {
    return {
      amount: Math.abs(totalReceivables - totalDues),
      type: totalReceivables >= totalDues ? 'receivable' : 'due',
      isBalanced: totalReceivables === totalDues,
    };
  }, [totalReceivables, totalDues]);

  const uniquePersons = useMemo(() => Array.from(new Set(debts.map(d => d.personName).filter(Boolean))), [debts]);

  const activeFilterCount = useMemo(() => {
    return (searchTerm ? 1 : 0) +
           (filterPerson !== 'ALL' ? 1 : 0) +
           (dateFrom ? 1 : 0) +
           (dateTo ? 1 : 0) +
           (minAmount ? 1 : 0) +
           (maxAmount ? 1 : 0);
  }, [searchTerm, filterPerson, dateFrom, dateTo, minAmount, maxAmount]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterPerson('ALL');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
  };

  const getFilteredData = (dataList: DebtRecord[], activeType: string) => {
    return dataList.filter(debt => {
      if (debt.type !== activeType) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = debt.personName?.toLowerCase().includes(q);
        const matchPurpose = debt.purpose?.toLowerCase().includes(q);
        const matchLocation = debt.location?.toLowerCase().includes(q);
        const matchNotes = debt.notes?.toLowerCase().includes(q);
        if (!matchName && !matchPurpose && !matchLocation && !matchNotes) return false;
      }

      if (filterPerson !== 'ALL') {
        if (debt.personName.toLowerCase() !== filterPerson.toLowerCase()) return false;
      }

      const recordDate = (debt.datetime || debt.createdAt || '').split('T')[0];
      if (dateFrom && recordDate < dateFrom) return false;
      if (dateTo && recordDate > dateTo) return false;

      if (minAmount && debt.amount < Number(minAmount)) return false;
      if (maxAmount && debt.amount > Number(maxAmount)) return false;

      return true;
    });
  };

  const pendingList = useMemo(() => getFilteredData(pendingDebts, activeTab), [pendingDebts, activeTab, searchTerm, filterPerson, dateFrom, dateTo, minAmount, maxAmount]);
  const settledList = useMemo(() => getFilteredData(settledDebts, activeTab), [settledDebts, activeTab, searchTerm, filterPerson, dateFrom, dateTo, minAmount, maxAmount]);

  const resetForm = () => {
    setShowAddForm(false);
    setEditId(null);
    setSuggestedBanner(null);
    setFormData({ 
      amount: '', 
      purpose: '', 
      location: '', 
      personName: '', 
      notes: '', 
      datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm") 
    });
  };

  const handleEditInit = (debt: DebtRecord) => {
    setEditId(debt.id!);
    setActiveTab(debt.type);
    setFormData({
      amount: debt.amount.toString(),
      purpose: debt.purpose,
      location: debt.location || '',
      personName: debt.personName,
      notes: debt.notes || '',
      datetime: debt.datetime ? new Date(debt.datetime).toISOString().slice(0, 16) : ''
    });
    setOpenMenuId(null);
    setShowAddForm(true);
  };

  return (
    <div className="p-3.5 sm:p-5 max-w-4xl mx-auto space-y-5 pb-32">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            <span>Dues & Receivables</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track money you owe and money people owe you
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRecurringDialog(true)}
            className="gap-1.5 text-xs font-bold rounded-xl border-border hover:bg-muted/60"
          >
            <Repeat className="w-3.5 h-3.5 text-amber-500" />
            <span>Recurring Rules</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="gap-1.5 text-xs font-bold rounded-xl shadow-md tap-spring flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Record</span>
          </Button>
        </div>
      </div>

      {/* Hero Net Balance & Health Card (Material 3 Style) */}
      <Card className="m3-card overflow-hidden border-border bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Overall Net Position
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl sm:text-4xl font-black ${
                  netBalance.type === 'receivable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {netBalance.type === 'receivable' ? '+' : '-'}{currencySymbol}{netBalance.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  netBalance.type === 'receivable' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
                }`}>
                  {netBalance.type === 'receivable' ? 'Net Receivable' : 'Net Due'}
                </span>
              </div>
            </div>

            {/* Quick KPI Badges */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  You Owe (Dues)
                </span>
                <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                  {currencySymbol}{totalDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex-1 sm:flex-initial p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Owed to You
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}{totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequent Counterparties Recommendations (Budgets Style) */}
      {frequentCounterparties.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Frequent Counterparties</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {frequentCounterparties.map((cp) => (
              <button
                key={cp.name}
                type="button"
                onClick={() => {
                  setFilterPerson(cp.name);
                  setSearchTerm(cp.name);
                }}
                className="p-3 rounded-2xl border border-border bg-card hover:bg-muted/40 text-left transition-all tap-spring flex flex-col justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {cp.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-foreground truncate block">
                    {cp.name}
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>{cp.count} logs</span>
                  {cp.pendingTotal > 0 && (
                    <span className="font-bold text-primary">
                      {currencySymbol}{cp.pendingTotal}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher & Search/Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Tab Switcher (One UI Pill Style) */}
        <div className="flex bg-muted/80 p-1 rounded-full border border-border backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab('due')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all tap-spring ${
              activeTab === 'due'
                ? 'bg-card text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Dues to Pay ({pendingDebts.filter(d => d.type === 'due').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receivable')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all tap-spring ${
              activeTab === 'receivable'
                ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Receivables ({pendingDebts.filter(d => d.type === 'receivable').length})</span>
          </button>
        </div>

        {/* Search & Filter Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search person or purpose..."
              className="h-9 pl-9 text-xs rounded-full bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-3.5 text-xs font-bold rounded-full gap-1.5 border-border tap-spring ${
              activeFilterCount > 0 ? 'border-primary text-primary bg-primary/10 shadow-xs' : ''
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <Card className="glass-card p-4 rounded-3xl shadow-lg space-y-3 animate-in slide-in-from-top-2 backdrop-blur-2xl bg-card border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Filter Records</span>
            {activeFilterCount > 0 && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 text-xs text-rose-500 font-bold rounded-full hover:bg-rose-500/10">
                Clear Filters ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Person Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground ml-1">Person</span>
              <Select value={filterPerson} onValueChange={setFilterPerson}>
                <SelectTrigger className="h-8 text-xs rounded-full bg-card border-border text-foreground">
                  <SelectValue placeholder="All Persons" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-card border-border text-foreground">
                  <SelectItem value="ALL">All Persons</SelectItem>
                  {uniquePersons.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range From */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground ml-1">From Date</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ colorScheme: isDarkTheme ? 'dark' : 'light' }}
                className="h-8 text-xs rounded-full bg-card border-border text-foreground"
              />
            </div>

            {/* Date Range To */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground ml-1">To Date</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ colorScheme: isDarkTheme ? 'dark' : 'light' }}
                className="h-8 text-xs rounded-full bg-card border-border text-foreground"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Pending Records List */}
      <div className="space-y-2.5">
        {pendingList.length === 0 ? (
          <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-foreground">No Pending {activeTab === 'due' ? 'Dues' : 'Receivables'}</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              All settled! Add a new record or review historical settled balances below.
            </p>
          </div>
        ) : (
          pendingList.map((debt) => {
            const isDue = debt.type === 'due';
            const isExpanded = expandedCardId === debt.id;

            return (
              <Card key={debt.id} className="m3-card border-border bg-card shadow-xs overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isDue ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {debt.personName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {debt.personName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground truncate font-medium">
                          {debt.purpose}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {debt.datetime ? format(parseISO(debt.datetime), 'dd MMM yyyy, hh:mm a') : 'Date unavailable'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-base sm:text-lg font-black ${
                      isDue ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isDue ? '-' : '+'}{currencySymbol}{debt.amount.toFixed(2)}
                    </span>

                    {/* Settle Action Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => settleDebt(debt.id!)}
                      className="h-8 px-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl gap-1"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span className="hidden sm:inline">Settle</span>
                    </Button>

                    {/* Quick Edit */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditInit(debt)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmAction({ id: debt.id!, type: 'delete' })}
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {(debt.location || debt.notes) && (
                  <div className="px-4 pb-3 pt-0 text-[11px] text-muted-foreground flex items-center gap-3 border-t border-border/40 mt-1">
                    {debt.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {debt.location}</span>}
                    {debt.notes && <span className="italic">"{debt.notes}"</span>}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Settled History Section */}
      {settledDebts.length > 0 && (
        <div className="pt-2 space-y-3">
          <Button
            variant="ghost"
            onClick={() => setShowSettledSection(!showSettledSection)}
            className="w-full justify-between font-bold text-xs text-muted-foreground h-9 px-2 hover:bg-muted/40 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span>Settled History ({settledList.length})</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showSettledSection ? 'rotate-180 text-primary' : ''}`} />
          </Button>

          {showSettledSection && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              {settledList.map((debt) => (
                <div key={debt.id} className="p-3 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs opacity-75">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold line-through text-foreground block truncate">{debt.personName} · {debt.purpose}</span>
                    <span className="text-[10px] text-muted-foreground">{debt.datetime ? format(parseISO(debt.datetime), 'dd MMM yyyy') : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold">{currencySymbol}{debt.amount.toFixed(2)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unsettleDebt(debt.id!)}
                      className="h-7 px-2 text-[10px] font-bold rounded-lg text-amber-600"
                    >
                      <Undo className="w-3 h-3 mr-1" />
                      Unsettle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Record Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden z-50">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              <span>{editId ? 'Edit Record' : 'Add Due / Receivable'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); saveDebt(); }} className="p-4 space-y-4">
            {/* Record Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('due')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeTab === 'due'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'border-border text-muted-foreground'
                }`}
              >
                Due (I Owe)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('receivable')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeTab === 'receivable'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'border-border text-muted-foreground'
                }`}
              >
                Receivable (Owed to Me)
              </button>
            </div>

            {/* Person Name with Autocomplete */}
            <div className="space-y-1.5 relative" ref={personContainerRef}>
              <Label className="text-xs font-bold">Person Name</Label>
              <Input
                value={formData.personName}
                onChange={(e) => {
                  setFormData({ ...formData, personName: e.target.value });
                  setPersonSuggestionsOpen(true);
                }}
                placeholder="e.g. Rahul, John, Sharma"
                required
                className="h-9 text-xs rounded-xl"
              />
              {personSuggestionsOpen && uniquePersons.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-1 z-50 max-h-36 overflow-y-auto">
                  {uniquePersons.filter(p => p.toLowerCase().includes(formData.personName.toLowerCase())).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPerson(p)}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted rounded-lg font-medium"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Amount ({currencySymbol})</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                className="h-9 text-xs rounded-xl font-bold"
              />
            </div>

            {/* Purpose */}
            <div className="space-y-1.5 relative" ref={purposeContainerRef}>
              <Label className="text-xs font-bold">Purpose / Item</Label>
              <Input
                value={formData.purpose}
                onChange={(e) => {
                  setFormData({ ...formData, purpose: e.target.value });
                  setPurposeSuggestionsOpen(true);
                }}
                placeholder="e.g. Dinner split, Rent share, Loan"
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.datetime}
                onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 text-xs font-bold rounded-xl"
              >
                {editId ? 'Save Changes' : 'Create Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recurring Debts Dialog */}
      <ManageRecurringDebtsDialog
        open={showRecurringDialog}
        onOpenChange={setShowRecurringDialog}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-xs p-4 text-center z-50">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-center">Confirm Action</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground my-2">
            Are you sure you want to delete this record permanently?
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)} className="h-8 text-xs rounded-xl">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirmAction) deleteDebt(confirmAction.id);
                setConfirmAction(null);
              }}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
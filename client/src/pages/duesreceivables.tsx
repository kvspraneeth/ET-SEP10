import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { DebtRecord } from '@/lib/db';
import { 
  Plus, Filter, X, MoreVertical, Edit2, Trash2, CheckCircle, 
  ChevronDown, ChevronUp, History, Undo, Search, Repeat, Calendar, 
  RotateCcw, Sparkles, MapPin, Clock, User, Zap
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSettings } from '@/hooks/use-settings';
import { ManageRecurringDebtsDialog } from '@/components/recurring-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, formatDistanceToNow, parseISO } from 'date-fns';

export default function DuesReceivables() {
  const { toast } = useToast();
  const settings = useSettings();

  const currencySymbol = useMemo(() => {
    switch (settings?.currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'INR': return '₹';
      default: return '₹';
    }
  }, [settings?.currency]);

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
  const [settledTab, setSettledTab] = useState<'due' | 'receivable'>('due');

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
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [suggestedBanner, setSuggestedBanner] = useState<string | null>(null);

  const personContainerRef = useRef<HTMLDivElement | null>(null);
  const purposeContainerRef = useRef<HTMLDivElement | null>(null);
  const locationContainerRef = useRef<HTMLDivElement | null>(null);

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
      if (locationContainerRef.current && !locationContainerRef.current.contains(e.target as Node)) {
        setLocationSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -------------------------------------------------------------
  // Historical Autocomplete Data (Date-first & frequency count)
  // -------------------------------------------------------------
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

  const historicalLocations = useMemo(() => {
    const list = debts.map(d => String(d.location || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [debts]);

  // Top 3 Recommended Dues (Quick Add for Dues)
  const topRecommendedDues = useMemo(() => {
    const map: Record<string, { count: number; lastDebt: DebtRecord; lastDate: string }> = {};
    debts.filter(d => d.type === activeTab).forEach(d => {
      const pName = String(d.personName || '').toLowerCase().trim();
      const purp = String(d.purpose || '').toLowerCase().trim();
      if (!pName) return;
      const key = `${pName}::${purp}`;
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

    return Object.values(map)
      .sort((a, b) => {
        const dateDiff = new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.count - a.count;
      })
      .slice(0, 3);
  }, [debts, activeTab]);

  // Filtered Person Suggestions
  const filteredPersonSuggestions = useMemo(() => {
    const q = String(formData.personName || '').trim().toLowerCase();
    const all = Object.values(historicalPersons);
    if (!q) {
      return all
        .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
        .slice(0, 6);
    }
    return all
      .filter(item => String(item.lastDebt.personName || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const aName = String(a.lastDebt.personName || '').toLowerCase();
        const bName = String(b.lastDebt.personName || '').toLowerCase();
        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      })
      .slice(0, 6);
  }, [historicalPersons, formData.personName]);

  // Filtered Purpose Suggestions
  const filteredPurposeSuggestions = useMemo(() => {
    const q = String(formData.purpose || '').trim().toLowerCase();
    if (!q) return historicalPurposes.slice(0, 6);
    return historicalPurposes.filter(p => p.toLowerCase().includes(q)).slice(0, 6);
  }, [historicalPurposes, formData.purpose]);

  // Filtered Location Suggestions
  const filteredLocationSuggestions = useMemo(() => {
    const q = formData.location.trim().toLowerCase();
    if (!q) return historicalLocations.slice(0, 5);
    return historicalLocations.filter(loc => loc.toLowerCase().includes(q)).slice(0, 5);
  }, [historicalLocations, formData.location]);

  // Apply Person Autocomplete Suggestion
  const applyPersonSuggestion = (personName: string, lastDebt: DebtRecord) => {
    setPersonSuggestionsOpen(false);
    const autoFilled: string[] = [];
    const newForm = { ...formData, personName };

    if (!newForm.purpose && lastDebt.purpose) {
      newForm.purpose = lastDebt.purpose;
      autoFilled.push('Purpose');
    }
    if (!newForm.location && lastDebt.location) {
      newForm.location = lastDebt.location;
      autoFilled.push('Where');
    }
    if (!newForm.amount && lastDebt.amount > 0) {
      newForm.amount = lastDebt.amount.toString();
      autoFilled.push('Amount');
    }

    setFormData(newForm);
    if (autoFilled.length > 0) {
      setSuggestedBanner(`Auto-suggested ${autoFilled.join(', ')} from past entry with ${personName}.`);
    }
  };

  // Reuse Due Handler
  const handleReuseDue = (debt: DebtRecord) => {
    setEditId(null);
    setActiveTab(debt.type);
    setFormData({
      amount: debt.amount.toString(),
      purpose: debt.purpose,
      location: debt.location || '',
      personName: debt.personName,
      notes: debt.notes || '',
      datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    });
    setSuggestedBanner(`Prefilled details from "${debt.personName}" with current date & time`);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // -------------------------------------------------------------
  // Mutations (Dexie)
  // -------------------------------------------------------------
  const saveDebt = async () => {
    setIsSubmitting(true);
    try {
      const debtPayload: Omit<DebtRecord, 'id'> = {
        type: activeTab,
        amount: Number(formData.amount),
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
        toast({ title: "Success", description: "Record updated successfully." });
      } else {
        await db.debts.add(debtPayload as DebtRecord);
        toast({ title: "Success", description: "Record saved successfully." });
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
      toast({ title: "Success", description: "Record marked as settled!" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to settle record.", variant: "destructive" });
    }
  };

  const unsettleDebt = async (id: number) => {
    try {
      await db.debts.update(id, { status: 'pending' });
      toast({ title: "Success", description: "Record moved back to pending." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to unsettle record.", variant: "destructive" });
    }
  };

  const deleteDebt = async (id: number) => {
    try {
      await db.debts.delete(id);
      toast({ title: "Deleted", description: "Record has been removed." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  // Derived Data & Calculations
  const pendingDebts = useMemo(() => debts.filter(d => d.status === 'pending'), [debts]);
  const settledDebts = useMemo(() => debts.filter(d => d.status === 'settled'), [debts]);

  const netBalance = useMemo(() => {
    const totalDues = pendingDebts.filter(d => d.type === 'due').reduce((sum, d) => sum + d.amount, 0);
    const totalReceivables = pendingDebts.filter(d => d.type === 'receivable').reduce((sum, d) => sum + d.amount, 0);
    return {
      amount: Math.abs(totalReceivables - totalDues),
      type: totalReceivables >= totalDues ? 'receivable' : 'due'
    };
  }, [pendingDebts]);

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

  const getGroupedData = (dataList: DebtRecord[], activeType: string) => {
    const filtered = dataList.filter(debt => {
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

    const groups: { [key: string]: DebtRecord[] } = {};
    filtered.forEach(debt => {
      const dateObj = new Date(debt.datetime || debt.createdAt);
      const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(debt);
    });

    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  const groupedPending = getGroupedData(pendingDebts, activeTab);
  const groupedSettled = getGroupedData(settledDebts, settledTab);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveDebt();
  };

  const toggleMenu = (id: number) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleContainerClick = () => { if (openMenuId) setOpenMenuId(null); };

  // Helper for quick date button
  const setQuickDate = (type: 'today' | 'yesterday') => {
    const base = type === 'today' ? new Date() : subDays(new Date(), 1);
    const currentTime = formData.datetime.includes('T') ? formData.datetime.split('T')[1] : '09:00';
    setFormData({ ...formData, datetime: `${format(base, 'yyyy-MM-dd')}T${currentTime}` });
  };

  const setQuickTimeNow = () => {
    const currentDate = formData.datetime.includes('T') ? formData.datetime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
    setFormData({ ...formData, datetime: `${currentDate}T${format(new Date(), 'HH:mm')}` });
  };

  // -------------------------------------------------------------
  // Card Renderer
  // -------------------------------------------------------------
  const renderDebtCard = (debt: DebtRecord, isSettledView: boolean = false) => {
    const isExpanded = expandedCardId === debt.id;
    const isMenuOpen = openMenuId === debt.id;
    const isDue = debt.type === 'due';

    return (
      <div key={debt.id} className="relative p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xs transition-all hover:shadow-md">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-white shadow-inner ${isDue ? 'bg-red-400' : 'bg-green-400'} ${isSettledView ? 'opacity-50' : ''}`}>
              {debt.personName ? debt.personName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className={`font-bold text-gray-900 dark:text-white leading-tight truncate ${isSettledView ? 'line-through opacity-70' : ''}`}>{debt.personName}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 truncate">{debt.purpose}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className={`font-bold text-lg ${isDue ? 'text-red-500' : 'text-green-500'} ${isSettledView ? 'opacity-70' : ''}`}>
              {isDue ? '-' : '+'}{currencySymbol}{debt.amount.toFixed(2)}
            </p>

            <Button
              variant="ghost"
              size="icon"
              title="Reuse transaction"
              onClick={(e) => { e.stopPropagation(); handleReuseDue(debt); }}
              className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <button onClick={(e) => { e.stopPropagation(); toggleMenu(debt.id!); }} className="p-1 text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full bg-gray-50 dark:bg-gray-700/50">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* 3-Dots Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-4 top-12 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 overflow-hidden text-sm animate-in fade-in zoom-in-95">
            {!isSettledView ? (
              <>
                <button onClick={() => setConfirmAction({ id: debt.id!, type: 'settle' })} className="w-full text-left px-4 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 flex items-center gap-2">
                  <CheckCircle size={14} /> Settle
                </button>
                <button onClick={() => handleEditInit(debt)} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-white">
                  <Edit2 size={14} /> Edit
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmAction({ id: debt.id!, type: 'unsettle' })} className="w-full text-left px-4 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 flex items-center gap-2">
                <Undo size={14} /> Unsettle
              </button>
            )}
            <button onClick={() => setConfirmAction({ id: debt.id!, type: 'delete' })} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}

        <div 
          className="mt-2 flex items-center justify-center pt-2 border-t border-gray-100 dark:border-gray-700/50 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() => setExpandedCardId(isExpanded ? null : debt.id!)}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 text-sm space-y-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg animate-in slide-in-from-top-1">
            {debt.location && <p><span className="font-semibold text-gray-700 dark:text-gray-300">Where:</span> {debt.location}</p>}
            {debt.notes && <p><span className="font-semibold text-gray-700 dark:text-gray-300">Notes:</span> <span className="italic">"{debt.notes}"</span></p>}
            <p><span className="font-semibold text-gray-700 dark:text-gray-300">Date:</span> {new Date(debt.datetime || debt.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6" onClick={handleContainerClick}>
      
      {/* Top Header & Net Balance */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Dues Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Manage pending balances and receivables</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRecurringDialog(true)}
            className="gap-1.5 text-xs font-semibold h-9 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Recurring Dues</span>
          </Button>

          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Net {netBalance.type === 'receivable' ? 'Receivable' : 'Due'}
            </p>
            <p className={`text-3xl font-black ${netBalance.amount === 0 ? 'text-gray-500' : netBalance.type === 'due' ? 'text-red-500' : 'text-green-500'}`}>
              {currencySymbol}{netBalance.amount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Tab Switcher: Dues vs Receivables */}
      <div className="flex bg-gray-200 dark:bg-gray-800 rounded-xl p-1 max-w-2xl mx-auto">
        <button type="button" className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'due' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setActiveTab('due')}>
          Dues (To Pay)
        </button>
        <button type="button" className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'receivable' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setActiveTab('receivable')}>
          Receivables (To Get)
        </button>
      </div>

      {/* Recommended / Frequent Dues Section (Quick Add) */}
      {topRecommendedDues.length > 0 && !showAddForm && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Frequent {activeTab === 'due' ? 'Dues' : 'Receivables'} (Quick Add)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topRecommendedDues.map((item, idx) => {
              const d = item.lastDebt;
              const recency = item.lastDate ? formatDistanceToNow(parseISO(item.lastDate), { addSuffix: true }) : '';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleReuseDue(d)}
                  className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-xs hover:shadow-md hover:border-primary/40 text-left flex items-center justify-between transition-all group"
                >
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary truncate">
                      {d.personName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.purpose} {d.location ? `• ${d.location}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`font-bold text-sm ${d.type === 'due' ? 'text-red-500' : 'text-green-500'}`}>
                      {currencySymbol}{d.amount.toFixed(2)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {item.count}x {recency ? `• ${recency}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Toggle Button */}
      <div className="flex justify-end gap-2">
        <Button 
          variant={showFilters ? "secondary" : "outline"} 
          size="sm"
          onClick={() => setShowFilters(!showFilters)} 
          className="gap-2 relative rounded-full"
        >
          <Filter size={15} />
          <span>Filters</span>
          {activeFilterCount > 0 && !showFilters && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded Multi-Criteria Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Filter Dues & Receivables</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-red-500 hover:text-red-600">
                Clear All ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by person, purpose, location, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Person</label>
              <Select value={filterPerson} onValueChange={setFilterPerson}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Persons" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  <SelectItem value="ALL">All Persons</SelectItem>
                  {uniquePersons.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Min Amount</label>
              <Input
                type="number"
                placeholder="₹ Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Max Amount</label>
              <Input
                type="number"
                placeholder="₹ Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add New Due/Receivable Button */}
      {!showAddForm && (
        <button type="button" onClick={() => setShowAddForm(true)} className="w-full bg-primary/10 text-primary dark:text-blue-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/20 transition-all border border-primary/20 hover:scale-[1.01] active:scale-[0.99]">
          <Plus size={20} /> Add New {activeTab === 'due' ? 'Due' : 'Receivable'}
        </button>
      )}

      {/* Add / Edit Form with Fuzzy Search & Autocomplete */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-4 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>{editId ? 'Edit Record' : `New ${activeTab === 'due' ? 'Due (To Pay)' : 'Receivable (To Get)'}`}</span>
            </h3>
            <button type="button" onClick={resetForm} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={18} /></button>
          </div>

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
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="relative w-full">
              <span className="absolute left-3.5 top-3.5 text-gray-400 font-bold">{currencySymbol}</span>
              <input 
                required 
                type="number" 
                step="0.01" 
                placeholder="Amount" 
                className="w-full pl-9 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white font-bold text-lg" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
              />
            </div>

            {/* Person Name with Fuzzy Search Dropdown */}
            <div ref={personContainerRef} className="relative">
              <input 
                required 
                type="text" 
                placeholder="Person Name" 
                autoComplete="off"
                onFocus={() => setPersonSuggestionsOpen(true)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white font-medium" 
                value={formData.personName} 
                onChange={e => {
                  setFormData({...formData, personName: e.target.value});
                  setPersonSuggestionsOpen(true);
                }} 
              />
              {personSuggestionsOpen && filteredPersonSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b text-[11px] font-semibold text-muted-foreground flex justify-between">
                    <span className="flex items-center gap-1"><History className="w-3 h-3 text-primary" /> Past Persons</span>
                    <span>Click to auto-fill</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredPersonSuggestions.map(item => {
                      const d = item.lastDebt;
                      const timeAgo = item.lastDate ? formatDistanceToNow(parseISO(item.lastDate), { addSuffix: true }) : '';
                      return (
                        <button
                          key={d.personName}
                          type="button"
                          onClick={() => applyPersonSuggestion(d.personName, d)}
                          className="w-full text-left px-3.5 py-2 hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{d.personName}</p>
                            <p className="text-xs text-muted-foreground">{d.purpose} • {currencySymbol}{d.amount}</p>
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

            {/* Purpose with Fuzzy Suggestions */}
            <div ref={purposeContainerRef} className="relative md:col-span-2">
              <input 
                required 
                type="text" 
                placeholder="Purpose / On what (e.g. Dinner share, Rent, Petrol)" 
                autoComplete="off"
                onFocus={() => setPurposeSuggestionsOpen(true)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white" 
                value={formData.purpose} 
                onChange={e => {
                  setFormData({...formData, purpose: e.target.value});
                  setPurposeSuggestionsOpen(true);
                }} 
              />
              {purposeSuggestionsOpen && filteredPurposeSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                  <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredPurposeSuggestions.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, purpose: p });
                          setPurposeSuggestionsOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-sm hover:bg-primary/5 dark:hover:bg-primary/10"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Where / Location with Autocomplete */}
            <div ref={locationContainerRef} className="relative">
              <input 
                type="text" 
                placeholder="Where / Place (Optional)" 
                autoComplete="off"
                onFocus={() => setLocationSuggestionsOpen(true)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white" 
                value={formData.location} 
                onChange={e => {
                  setFormData({...formData, location: e.target.value});
                  setLocationSuggestionsOpen(true);
                }} 
              />
              {locationSuggestionsOpen && filteredLocationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                  <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredLocationSuggestions.map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, location: loc });
                          setLocationSuggestionsOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-sm hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center justify-between"
                      >
                        <span>{loc}</span>
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date & Time with Quick Action Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" /> Date & Time
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate('today')}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 text-gray-700 dark:text-gray-200"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('yesterday')}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 text-gray-700 dark:text-gray-200"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={setQuickTimeNow}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 text-gray-700 dark:text-gray-200"
                  >
                    Now
                  </button>
                </div>
              </div>
              <input 
                type="datetime-local" 
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 dark:[color-scheme:dark]" 
                value={formData.datetime} 
                onChange={e => setFormData({...formData, datetime: e.target.value})} 
              />
            </div>

            <textarea 
              placeholder="Notes (Optional)" 
              rows={2} 
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white md:col-span-2 resize-none" 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
            
            <div className="md:col-span-2 mt-2">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 text-base"
              >
                {editId ? "Update Record" : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending List View */}
      <div className="space-y-6">
        {groupedPending.length === 0 && !showAddForm ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-base">
              {activeFilterCount > 0 ? "No records match your filters." : `No pending ${activeTab}s.`}
            </p>
          </div>
        ) : null}

        {groupedPending.map(([dateString, items]) => (
          <div key={dateString} className="space-y-3">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">{dateString}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {items.map((debt: DebtRecord) => renderDebtCard(debt, false))}
            </div>
          </div>
        ))}
      </div>

      {/* Settled Section Toggle */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button 
          onClick={() => setShowSettledSection(!showSettledSection)}
          className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex justify-center items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold shadow-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          <History size={18} />
          {showSettledSection ? 'Hide Settled Transactions' : 'View Settled Transactions'}
        </button>
      </div>

      {/* Settled Section Content */}
      {showSettledSection && (
        <div className="space-y-4 animate-in slide-in-from-top-3 fade-in">
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 max-w-xl mx-auto">
            <button type="button" className={`flex-1 py-2 rounded-md font-semibold text-xs transition-all ${settledTab === 'due' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setSettledTab('due')}>
              Settled Dues
            </button>
            <button type="button" className={`flex-1 py-2 rounded-md font-semibold text-xs transition-all ${settledTab === 'receivable' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setSettledTab('receivable')}>
              Settled Receivables
            </button>
          </div>

          <div className="space-y-5">
            {groupedSettled.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No settled records found.
              </div>
            ) : null}

            {groupedSettled.map(([dateString, items]) => (
              <div key={dateString} className="space-y-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">{dateString}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {items.map((debt: DebtRecord) => renderDebtCard(debt, true))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-2 dark:text-white">
              {confirmAction.type === 'delete' ? 'Delete Record?' : confirmAction.type === 'settle' ? 'Settle Record?' : 'Unsettle Record?'}
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              {confirmAction.type === 'delete' 
                ? 'Are you sure you want to permanently delete this record? This cannot be undone.'
                : confirmAction.type === 'settle' 
                  ? 'Are you sure you want to mark this record as settled?' 
                  : 'Are you sure you want to move this record back to pending?'}
            </p>
            <div className="flex justify-end gap-2.5">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                variant={confirmAction.type === 'delete' ? 'destructive' : 'default'}
                onClick={() => {
                  if (confirmAction.type === 'settle') settleDebt(confirmAction.id);
                  else if (confirmAction.type === 'unsettle') unsettleDebt(confirmAction.id);
                  else if (confirmAction.type === 'delete') deleteDebt(confirmAction.id);
                  setConfirmAction(null);
                  setOpenMenuId(null);
                }}
              >
                Yes, {confirmAction.type === 'delete' ? 'Delete' : confirmAction.type === 'settle' ? 'Settle' : 'Unsettle'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Debts Modal */}
      <ManageRecurringDebtsDialog
        open={showRecurringDialog}
        onOpenChange={setShowRecurringDialog}
      />
    </div>
  );
}
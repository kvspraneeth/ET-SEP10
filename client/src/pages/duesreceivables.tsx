import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { DebtRecord } from '@/lib/db';
import { Plus, Filter, X, MoreVertical, Edit2, Trash2, CheckCircle, ChevronDown, ChevronUp, History, Undo } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSettings } from '@/hooks/use-settings';

export default function DuesReceivables() {
  const { toast } = useToast();
  const settings = useSettings();

  // Determine Currency Symbol
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

  // Filter & Form States
  const [filterPerson, setFilterPerson] = useState('');
  const [formData, setFormData] = useState({
    amount: '', purpose: '', location: '', personName: '', notes: '', datetime: ''
  });

  // -------------------------------------------------------------
  // Data Fetching (Dexie)
  // -------------------------------------------------------------
  const debts = useLiveQuery(() => db.debts.toArray()) || [];

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

  // -------------------------------------------------------------
  // Derived Data & Calculations
  // -------------------------------------------------------------
  const pendingDebts = useMemo(() => debts.filter(d => d.status === 'pending'), [debts]);
  const settledDebts = useMemo(() => debts.filter(d => d.status === 'settled'), [debts]);

  // Net Balance Calculation
  const netBalance = useMemo(() => {
    const totalDues = pendingDebts.filter(d => d.type === 'due').reduce((sum, d) => sum + d.amount, 0);
    const totalReceivables = pendingDebts.filter(d => d.type === 'receivable').reduce((sum, d) => sum + d.amount, 0);
    return {
      amount: Math.abs(totalReceivables - totalDues),
      type: totalReceivables >= totalDues ? 'receivable' : 'due'
    };
  }, [pendingDebts]);

  const uniquePersons = useMemo(() => Array.from(new Set(debts.map(d => d.personName).filter(Boolean))), [debts]);

  // Grouping Function
  const getGroupedData = (dataList: DebtRecord[], activeType: string) => {
    const filtered = dataList.filter(debt => {
      if (debt.type !== activeType) return false;
      if (filterPerson && !debt.personName.toLowerCase().includes(filterPerson.toLowerCase())) return false;
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

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const resetForm = () => {
    setShowAddForm(false);
    setEditId(null);
    setFormData({ amount: '', purpose: '', location: '', personName: '', notes: '', datetime: '' });
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

  // -------------------------------------------------------------
  // Render Helpers
  // -------------------------------------------------------------
  const renderDebtCard = (debt: DebtRecord, isSettledView: boolean = false) => {
    const isExpanded = expandedCardId === debt.id;
    const isMenuOpen = openMenuId === debt.id;
    const isDue = debt.type === 'due';

    return (
      <div key={debt.id} className="relative p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm transition-all hover:shadow-md">
        
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white shadow-inner ${isDue ? 'bg-red-400' : 'bg-green-400'} ${isSettledView ? 'opacity-50' : ''}`}>
              {debt.personName ? debt.personName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="flex-1">
              <p className={`font-bold text-gray-900 dark:text-white leading-tight ${isSettledView ? 'line-through opacity-70' : ''}`}>{debt.personName}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{debt.purpose}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <p className={`font-bold text-lg ${isDue ? 'text-red-500' : 'text-green-500'} ${isSettledView ? 'opacity-70' : ''}`}>
                {isDue ? '-' : '+'}{currencySymbol}{debt.amount.toFixed(2)}
              </p>
              {/* 3 Dots Menu Button - Now visible on both pending and settled views */}
              <button onClick={(e) => { e.stopPropagation(); toggleMenu(debt.id!); }} className="p-1 text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full bg-gray-50 dark:bg-gray-700/50">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 3-Dots Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-4 top-12 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 overflow-hidden text-sm">
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
          <div className="mt-2 pt-2 text-sm space-y-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
            {debt.location && <p><span className="font-semibold text-gray-700 dark:text-gray-300">Where:</span> {debt.location}</p>}
            {debt.notes && <p><span className="font-semibold text-gray-700 dark:text-gray-300">Notes:</span> <span className="italic">"{debt.notes}"</span></p>}
            <p><span className="font-semibold text-gray-700 dark:text-gray-300">Date:</span> {new Date(debt.datetime || debt.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    // Changed max-w-md to max-w-5xl to allow wider layout on desktop
    <div className="p-4 max-w-5xl mx-auto" onClick={handleContainerClick}>
      
      {/* Top Header & Net Balance */}
      <div className="mb-6 flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Dues Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Manage pending balances</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Net {netBalance.type === 'receivable' ? 'Receivable' : 'Due'}
          </p>
          <p className={`text-3xl font-black ${netBalance.amount === 0 ? 'text-gray-500' : netBalance.type === 'due' ? 'text-red-500' : 'text-green-500'}`}>
            {currencySymbol}{netBalance.amount.toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-4 max-w-2xl mx-auto">
        <button type="button" className={`flex-1 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'due' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setActiveTab('due')}>
          Dues (To Pay)
        </button>
        <button type="button" className={`flex-1 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'receivable' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setActiveTab('receivable')}>
          Receivables (To Get)
        </button>
      </div>

      <div className="flex justify-end mb-4">
         <button onClick={() => setShowFilters(!showFilters)} className="text-sm flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Filter size={16} /> Filter by Person
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <input type="text" placeholder="Type person name..." list="person-recommendations" className="w-full md:w-1/2 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white" value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} />
          <datalist id="person-recommendations">{uniquePersons.map((name: any) => <option key={name} value={name} />)}</datalist>
        </div>
      )}

      {!showAddForm && (
        <button type="button" onClick={() => setShowAddForm(true)} className="w-full bg-primary/10 text-primary dark:text-blue-400 font-semibold py-4 rounded-xl mb-6 flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors border border-primary/20">
          <Plus size={20} /> Add New {activeTab === 'due' ? 'Due' : 'Receivable'}
        </button>
      )}

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold dark:text-white">{editId ? 'Edit Record' : `New ${activeTab === 'due' ? 'Due' : 'Receivable'}`}</h3>
            <button type="button" onClick={resetForm} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
          </div>
          {/* Responsive form grid: 1 column on mobile, 2 columns on medium screens and up */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative w-full">
              <span className="absolute left-3 top-3 text-gray-400 font-bold">{currencySymbol}</span>
              <input required type="number" step="0.01" placeholder="Amount" className="w-full pl-8 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <input required type="text" placeholder="Person Name" list="person-recommendations" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white" value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} />
            <input required type="text" placeholder="Purpose / On what" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white md:col-span-2" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
            <input type="text" placeholder="Where (Optional)" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            <input type="datetime-local" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300" value={formData.datetime} onChange={e => setFormData({...formData, datetime: e.target.value})} />
            <textarea placeholder="Notes (Optional)" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white md:col-span-2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            
            <div className="md:col-span-2 mt-2">
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-lg">
                {editId ? "Update Record" : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending List View */}
      <div className="space-y-6 mb-10">
        {groupedPending.length === 0 && !showAddForm ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No pending {activeTab}s.</p>
          </div>
        ) : null}

        {groupedPending.map(([dateString, items]) => (
          <div key={dateString}>
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">{dateString}</h2>
            {/* Grid for desktop layout of cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((debt: DebtRecord) => renderDebtCard(debt, false))}
            </div>
          </div>
        ))}
      </div>

      {/* Settled Section Toggle */}
      <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
        <button 
          onClick={() => setShowSettledSection(!showSettledSection)}
          className="w-full py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex justify-center items-center gap-2 text-gray-600 dark:text-gray-300 font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-lg"
        >
          <History size={20} />
          {showSettledSection ? 'Hide Settled Transactions' : 'View Settled Transactions'}
        </button>
      </div>

      {/* Settled Section Content */}
      {showSettledSection && (
        <div className="mt-6 animate-in slide-in-from-top-4 fade-in">
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 mb-6 max-w-2xl mx-auto">
            <button type="button" className={`flex-1 py-2 rounded-md font-semibold text-sm transition-all ${settledTab === 'due' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setSettledTab('due')}>
              Settled Dues
            </button>
            <button type="button" className={`flex-1 py-2 rounded-md font-semibold text-sm transition-all ${settledTab === 'receivable' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500'}`} onClick={() => setSettledTab('receivable')}>
              Settled Receivables
            </button>
          </div>

          <div className="space-y-6">
            {groupedSettled.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No settled records found.</p>
              </div>
            ) : null}

            {groupedSettled.map(([dateString, items]) => (
              <div key={dateString}>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{dateString}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <h3 className="text-xl font-bold mb-3 dark:text-white">
              {confirmAction.type === 'delete' ? 'Delete Record?' : confirmAction.type === 'settle' ? 'Settle Record?' : 'Unsettle Record?'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {confirmAction.type === 'delete' 
                ? 'Are you sure you want to permanently delete this record? This cannot be undone.'
                : confirmAction.type === 'settle' 
                  ? 'Are you sure you want to mark this record as settled?' 
                  : 'Are you sure you want to move this record back to pending?'}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-5 py-2.5 font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmAction.type === 'settle') settleDebt(confirmAction.id);
                  else if (confirmAction.type === 'unsettle') unsettleDebt(confirmAction.id);
                  else if (confirmAction.type === 'delete') deleteDebt(confirmAction.id);
                  setConfirmAction(null);
                  setOpenMenuId(null);
                }}
                className={`px-5 py-2.5 font-bold text-white rounded-lg transition-colors ${
                  confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Yes, {confirmAction.type === 'delete' ? 'Delete' : confirmAction.type === 'settle' ? 'Settle' : 'Unsettle'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-10"></div>
    </div>
  );
}
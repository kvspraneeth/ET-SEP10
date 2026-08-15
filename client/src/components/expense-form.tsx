import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  X, Upload, Loader2, Plus, FileText, Calendar, Clock, 
  MapPin, Sparkles, Building2, CreditCard, ChevronRight, History 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CategorySelector } from './category-selector';
import { useAddExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { expenseFormSchema, Expense } from '@shared/schema';
import { format, subDays, formatDistanceToNow, parseISO } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { cn } from '@/lib/utils';
import { processFileAttachment } from '@/lib/image-utils';
import { findCategory } from '@/lib/categories';

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCategory?: string;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, preSelectedCategory, editingExpense }: ExpenseFormProps) {
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const { toast } = useToast();
  
  // Custom Addition States for Payment Methods and Accounts
  const [customDialog, setCustomDialog] = useState<{ isOpen: boolean; type: 'paymentMethod' | 'account' | null }>({ 
    isOpen: false, 
    type: null 
  });
  const [customValue, setCustomValue] = useState('');
  
  // Local memory so the UI doesn't forget user typed values before saving
  const [sessionMethods, setSessionMethods] = useState<string[]>([]);
  const [sessionAccounts, setSessionAccounts] = useState<string[]>([]);

  // Autocomplete UI States
  const [titleSuggestionsOpen, setTitleSuggestionsOpen] = useState(false);
  const [whereSuggestionsOpen, setWhereSuggestionsOpen] = useState(false);
  const [suggestedBanner, setSuggestedBanner] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleContainerRef = useRef<HTMLDivElement | null>(null);
  const whereContainerRef = useRef<HTMLDivElement | null>(null);

  const addExpenseMutation = useAddExpense();
  const updateExpenseMutation = useUpdateExpense();

  // Fetch past expenses from Dexie DB
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      category: '',
      items: '',
      where: '',
      note: '',
      paymentMethod: 'UPI',
      account: 'ICICI',
      isRecurring: false,
      isTemplate: false,
      attachments: [] as string[],
      id: undefined,
    },
  });

  const isEditMode = Boolean(editingExpense && editingExpense.id);

  useEffect(() => {
    if (open) {
      setSuggestedBanner(null);
      setTitleSuggestionsOpen(false);
      setWhereSuggestionsOpen(false);

      if (editingExpense) {
        if (editingExpense.id) {
          // Editing existing expense
          form.reset({
            amount: editingExpense.amount,
            date: editingExpense.date,
            time: editingExpense.time,
            category: editingExpense.category,
            items: editingExpense.items ?? '',
            where: editingExpense.where ?? '',
            note: editingExpense.note ?? '',
            paymentMethod: editingExpense.paymentMethod,
            account: editingExpense.account,
            isRecurring: editingExpense.isRecurring ?? false,
            isTemplate: editingExpense.isTemplate ?? false,
            attachments: editingExpense.attachments ?? [],
            id: editingExpense.id,
          });
          setAttachments(editingExpense.attachments || []);
        } else {
          // Template / Quick Add from Frequent Transactions (new expense with current date & time)
          form.reset({
            amount: editingExpense.amount || 0,
            date: format(new Date(), 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm'),
            category: editingExpense.category || preSelectedCategory || '',
            items: editingExpense.items ?? '',
            where: editingExpense.where ?? '',
            note: editingExpense.note ?? '',
            paymentMethod: editingExpense.paymentMethod || 'UPI',
            account: editingExpense.account || 'ICICI',
            isRecurring: false,
            isTemplate: false,
            attachments: [],
            id: undefined,
          });
          setAttachments([]);
          setSuggestedBanner(`Prefilled "${editingExpense.items || 'Quick'}" details with current date & time`);
        }
      } else {
        // Blank new expense form
        form.reset({
          amount: 0,
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          category: preSelectedCategory || '',
          items: '',
          where: '',
          note: '',
          paymentMethod: 'UPI',
          account: 'ICICI',
          isRecurring: false,
          isTemplate: false,
          attachments: [] as string[],
          id: undefined,
        });
        setAttachments([]);
      }
    }
  }, [open, editingExpense, preSelectedCategory, form]);

  // Close suggestion dropdowns when clicking outside
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

  // Historical Metadata Mapping for Autocomplete & Suggestions
  // Sorted by Date (most recent first) then count
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

  // Unique "Where" locations from past expenses
  const historicalLocations = useMemo(() => {
    const locs = pastExpenses
      .map(e => e.where?.trim())
      .filter((loc): loc is string => Boolean(loc && loc.length > 0));
    return Array.from(new Set(locs));
  }, [pastExpenses]);

  // Title suggestions: sorted first by Date (most recent), then frequency count
  const titleValue = form.watch('items') || '';
  const filteredTitleSuggestions = useMemo(() => {
    const query = titleValue.trim().toLowerCase();
    const allTitles = Object.values(historicalTitles);

    if (!query) {
      return allTitles
        .sort((a, b) => {
          const dateDiff = new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
          if (dateDiff !== 0) return dateDiff;
          return b.count - a.count;
        })
        .slice(0, 6);
    }

    return allTitles
      .filter(item => {
        const itemText = (item.lastExpense.items || '').toLowerCase();
        return itemText.includes(query);
      })
      .sort((a, b) => {
        const aText = (a.lastExpense.items || '').toLowerCase();
        const bText = (b.lastExpense.items || '').toLowerCase();
        const aStarts = aText.startsWith(query);
        const bStarts = bText.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Sort by Date first, then count
        const dateDiff = new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.count - a.count;
      })
      .slice(0, 8);
  }, [historicalTitles, titleValue]);

  // Filter for "Where" suggestions
  const whereValue = form.watch('where') || '';
  const filteredWhereSuggestions = useMemo(() => {
    const query = whereValue.trim().toLowerCase();
    if (!query) return historicalLocations.slice(0, 5);
    return historicalLocations
      .filter(loc => loc.toLowerCase().includes(query))
      .slice(0, 5);
  }, [historicalLocations, whereValue]);

  // Apply suggestion when a title is picked
  const applyTitleSuggestion = (selectedTitle: string, lastExpense: Expense) => {
    form.setValue('items', selectedTitle, { shouldDirty: true, shouldValidate: true });
    setTitleSuggestionsOpen(false);

    const currentWhere = form.getValues('where');
    const currentCategory = form.getValues('category');
    const currentAmount = form.getValues('amount');

    let autoFilledFields = [];

    if (!currentWhere && lastExpense.where) {
      form.setValue('where', lastExpense.where, { shouldDirty: true });
      autoFilledFields.push('Where');
    }

    if ((!currentCategory || currentCategory === '') && lastExpense.category) {
      form.setValue('category', lastExpense.category, { shouldDirty: true });
      autoFilledFields.push('Category');
    }

    if (lastExpense.paymentMethod) {
      form.setValue('paymentMethod', lastExpense.paymentMethod, { shouldDirty: true });
    }

    if (lastExpense.account) {
      form.setValue('account', lastExpense.account, { shouldDirty: true });
    }

    if ((!currentAmount || currentAmount === 0) && lastExpense.amount > 0) {
      form.setValue('amount', lastExpense.amount, { shouldDirty: true });
      autoFilledFields.push('Amount');
    }

    if (autoFilledFields.length > 0) {
      setSuggestedBanner(`Auto-suggested ${autoFilledFields.join(', ')} from past entry.`);
    }
  };

  // Safe Compressed Image Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    try {
      const validFiles = Array.from(files).filter(
        file => file.type.startsWith('image/') || file.type === 'application/pdf'
      );

      for (const file of validFiles) {
        try {
          const processedBase64 = await processFileAttachment(file);
          setAttachments(prev => [...prev, processedBase64]);
        } catch (err: any) {
          toast({
            title: 'File processing error',
            description: err.message || 'Could not process attachment.',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsProcessingFiles(false);
      event.target.value = '';
    }
  };

  const handleClose = () => onOpenChange(false);

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data, attachments };
      if (editingExpense && editingExpense.id) {
        await updateExpenseMutation.mutateAsync({ ...payload, id: editingExpense.id });
      } else {
        await addExpenseMutation.mutateAsync(payload);
      }
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Failed to save',
        description: err.message || 'An error occurred while saving the expense.',
        variant: 'destructive',
      });
    }
  };

  const saveCustomValue = () => {
    const val = customValue.trim();
    if (val && customDialog.type) {
      if (customDialog.type === 'paymentMethod') {
        setSessionMethods(prev => [...prev, val]);
      } else if (customDialog.type === 'account') {
        setSessionAccounts(prev => [...prev, val]);
      }
      form.setValue(customDialog.type, val, { shouldValidate: true, shouldDirty: true });
    }
    setCustomDialog({ isOpen: false, type: null });
    setCustomValue('');
  };

  const uniquePaymentMethods = useMemo(() => {
    return Array.from(new Set([
      'UPI', 'Cash', 'Card',
      ...pastExpenses.map(e => e.paymentMethod).filter(Boolean),
      ...sessionMethods
    ]));
  }, [pastExpenses, sessionMethods]);

  const uniqueAccounts = useMemo(() => {
    return Array.from(new Set([
      'ICICI', 'HDFC', 'SBI',
      ...pastExpenses.map(e => (e as any).account).filter(Boolean),
      ...sessionAccounts
    ]));
  }, [pastExpenses, sessionAccounts]);

  const currentDateValue = form.watch('date');
  const isDateToday = currentDateValue === format(new Date(), 'yyyy-MM-dd');
  const isDateYesterday = currentDateValue === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Relative formatted date for preview
  const formattedDatePreview = useMemo(() => {
    try {
      if (!currentDateValue) return '';
      const parsed = parseISO(currentDateValue);
      return format(parsed, 'EEE, MMM d, yyyy');
    } catch {
      return currentDateValue;
    }
  }, [currentDateValue]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>{isEditMode ? 'Edit Expense' : 'Add Expense'}</span>
            </DialogTitle>
          </DialogHeader>

          {suggestedBanner && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between text-xs text-primary animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{suggestedBanner}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSuggestedBanner(null)} 
                className="text-primary/70 hover:text-primary p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
              
              {/* Amount Input */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold flex items-center justify-between">
                      <span>Amount <span className="text-red-500">*</span></span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₹</span>
                        <Input 
                          {...field} 
                          placeholder="0.00" 
                          type="number" 
                          step="0.01"
                          autoFocus={!isEditMode}
                          className="pl-9 text-lg font-bold h-12 rounded-xl"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title with Smart Fuzzy Search & Autocomplete */}
              <FormField
                control={form.control}
                name="items"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel className="text-sm font-semibold flex items-center justify-between">
                      <span>Title / Item</span>
                      <span className="text-xs text-muted-foreground font-normal">What did you spend on?</span>
                    </FormLabel>
                    <FormControl>
                      <div ref={titleContainerRef} className="relative">
                        <Input 
                          {...field} 
                          ref={(e) => {
                            field.ref(e);
                            titleInputRef.current = e;
                          }}
                          placeholder="e.g. Morning Coffee, Grocery Shopping, Metro" 
                          autoComplete="off"
                          onFocus={() => setTitleSuggestionsOpen(true)}
                          onChange={(e) => {
                            field.onChange(e);
                            setTitleSuggestionsOpen(true);
                          }}
                          className="h-10 rounded-lg text-sm"
                        />

                        {/* Title Fuzzy Search Suggestions Dropdown */}
                        {titleSuggestionsOpen && filteredTitleSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <History className="w-3 h-3 text-primary" /> Recent & Frequent
                              </span>
                              <span>Click to auto-fill</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                              {filteredTitleSuggestions.map((item) => {
                                const exp = item.lastExpense;
                                const titleName = exp.items || '';
                                const cat = findCategory(categories, exp.category);
                                const timeAgo = exp.date ? formatDistanceToNow(parseISO(exp.date), { addSuffix: true }) : '';

                                return (
                                  <button
                                    key={titleName}
                                    type="button"
                                    onClick={() => applyTitleSuggestion(titleName, exp)}
                                    className="w-full text-left px-3.5 py-2.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-between group"
                                  >
                                    <div className="overflow-hidden">
                                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary truncate">
                                        {titleName}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {cat?.name || 'General'} {exp.where ? `• ${exp.where}` : ''} • ₹{exp.amount}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 ml-2">
                                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-gray-700 text-muted-foreground font-medium">
                                        {item.count}x used
                                      </span>
                                      <span className="text-[9px] text-muted-foreground mt-0.5">{timeAgo}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Selector */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Category <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <CategorySelector 
                        selectedCategory={field.value} 
                        onCategorySelect={(catId) => field.onChange(catId)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Elegant Date & Time Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                {/* Date Selection */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => field.onChange(format(new Date(), 'yyyy-MM-dd'))}
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-semibold transition-all border",
                              isDateToday 
                                ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
                            )}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-semibold transition-all border",
                              isDateYesterday 
                                ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
                            )}
                          >
                            Yesterday
                          </button>
                        </div>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            type="date" 
                            className="h-10 rounded-lg text-sm bg-white dark:bg-gray-800 font-medium dark:[color-scheme:dark]" 
                          />
                        </div>
                      </FormControl>
                      {formattedDatePreview && (
                        <p className="text-[11px] text-muted-foreground px-1 font-medium">{formattedDatePreview}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Selection */}
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Time
                        </FormLabel>
                        <button
                          type="button"
                          onClick={() => field.onChange(format(new Date(), 'HH:mm'))}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                        >
                          Now
                        </button>
                      </div>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="time" 
                          className="h-10 rounded-lg text-sm bg-white dark:bg-gray-800 font-medium dark:[color-scheme:dark]" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Where / Vendor */}
              <FormField
                control={form.control}
                name="where"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> Where / Place
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">Optional</span>
                    </FormLabel>
                    <FormControl>
                      <div ref={whereContainerRef} className="relative">
                        <Input 
                          {...field} 
                          placeholder="e.g. Starbucks, Amazon, Shell, Metro Station"
                          autoComplete="off"
                          onFocus={() => setWhereSuggestionsOpen(true)}
                          onChange={(e) => {
                            field.onChange(e);
                            setWhereSuggestionsOpen(true);
                          }}
                          className="h-10 rounded-lg text-sm"
                        />

                        {whereSuggestionsOpen && filteredWhereSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                            <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                              {filteredWhereSuggestions.map((loc) => (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => {
                                    form.setValue('where', loc, { shouldDirty: true });
                                    setWhereSuggestionsOpen(false);
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
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Payment Method & Bank Account Selection */}
              <div className="grid grid-cols-2 gap-3.5">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-primary" /> Payment Method
                      </FormLabel>
                      <Select 
                        onValueChange={(val) => val === 'NEW' ? setCustomDialog({ isOpen: true, type: 'paymentMethod' }) : field.onChange(val)} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-lg text-sm">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[70]">
                          <SelectItem value="NEW" className="font-semibold text-primary focus:bg-primary/10 cursor-pointer">
                            <div className="flex items-center gap-2"><Plus className="w-4 h-4" /><span>Add New...</span></div>
                          </SelectItem>
                          {uniquePaymentMethods.map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-primary" /> Account / Bank
                      </FormLabel>
                      <Select 
                        onValueChange={(val) => val === 'NEW' ? setCustomDialog({ isOpen: true, type: 'account' }) : field.onChange(val)} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-lg text-sm">
                            <SelectValue placeholder="Account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[70]">
                          <SelectItem value="NEW" className="font-semibold text-primary focus:bg-primary/10 cursor-pointer">
                            <div className="flex items-center gap-2"><Plus className="w-4 h-4" /><span>Add New Bank...</span></div>
                          </SelectItem>
                          {uniqueAccounts.map(acc => (
                            <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional details or comments..." rows={2} className="rounded-lg text-sm resize-none" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Safe Attachments with Compression */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Bill / Receipt Attachments</Label>
                <div className="mt-1.5 flex items-center justify-center w-full">
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-center justify-center py-2">
                      {isProcessingFiles ? (
                        <>
                          <Loader2 className="w-6 h-6 mb-1 text-primary animate-spin" />
                          <p className="text-xs text-primary font-medium">Compressing & optimizing...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground"><span className="font-semibold text-primary">Upload receipts</span> (Images or PDFs)</p>
                        </>
                      )}
                    </div>
                    <input 
                      id="file-upload" 
                      type="file" 
                      accept="image/*,application/pdf" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      multiple 
                      disabled={isProcessingFiles}
                    />
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {attachments.map((att, i) => {
                      const isPdf = att.startsWith('data:application/pdf');
                      return (
                        <div key={i} className="relative rounded-lg overflow-hidden border">
                          {isPdf ? (
                            <button
                              type="button"
                              onClick={() => window.open(att, '_blank')}
                              className="flex h-16 w-full flex-col items-center justify-center gap-1 bg-slate-100 dark:bg-gray-800 p-2 text-xs text-muted-foreground hover:text-primary"
                            >
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="text-[10px]">PDF</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => window.open(att, '_blank')}
                              className="block h-16 w-full overflow-hidden"
                            >
                              <img src={att} className="h-full w-full object-cover" alt={`attachment ${i + 1}`} />
                            </button>
                          )}
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-1 right-1 h-5 w-5 rounded-full" 
                            onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 min-w-[130px] font-bold" 
                  disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending || isProcessingFiles}
                >
                  {addExpenseMutation.isPending || updateExpenseMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    isEditMode ? 'Update Expense' : 'Save Expense'
                  )}
                </Button>
              </div>

            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Internal Dialog for Custom Values */}
      <Dialog open={customDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setCustomDialog({ isOpen: false, type: null })}>
        <DialogContent className="sm:max-w-xs z-[75]">
          <DialogHeader>
            <DialogTitle>Add New {customDialog.type === 'account' ? 'Bank / Account' : 'Payment Method'}</DialogTitle>
          </DialogHeader>
          <Input 
            value={customValue} 
            onChange={(e) => setCustomValue(e.target.value)} 
            placeholder={`e.g. ${customDialog.type === 'account' ? 'Axis Bank' : 'Crypto'}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveCustomValue();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCustomDialog({ isOpen: false, type: null })}>Cancel</Button>
            <Button type="button" onClick={saveCustomValue}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
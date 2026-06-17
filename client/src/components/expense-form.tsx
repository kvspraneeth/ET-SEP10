import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Loader2, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CategorySelector } from './category-selector';
import { DatePicker } from './date-picker';
import { useAddExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { expenseFormSchema, Expense } from '@shared/schema';
import { format, parseISO } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCategory?: string;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, preSelectedCategory, editingExpense }: ExpenseFormProps) {
  const [attachments, setAttachments] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Custom Addition States
  const [customDialog, setCustomDialog] = useState<{ isOpen: boolean, type: 'paymentMethod' | 'account' | null }>({ isOpen: false, type: null });
  const [customValue, setCustomValue] = useState('');
  
  // Local memory so the UI doesn't forget your typed value before you hit save
  const [sessionMethods, setSessionMethods] = useState<string[]>([]);
  const [sessionAccounts, setSessionAccounts] = useState<string[]>([]);

  const addExpenseMutation = useAddExpense();
  const updateExpenseMutation = useUpdateExpense();

  // Fetch past expenses to dynamically build lists
  const pastExpenses = useLiveQuery(() => db.expenses.toArray()) || [];

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

  useEffect(() => {
    if (open) {
      if (editingExpense) {
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
    const invalidFiles = Array.from(files).filter((file) => !(file.type.startsWith('image/') || file.type === 'application/pdf'));

    if (invalidFiles.length > 0) {
      toast({
        title: 'Only images and PDFs are accepted',
        description: 'Some files were skipped because they are not supported.',
        variant: 'destructive',
      });
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachments(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
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
    } catch (err) {
      console.error(err);
    }
  };

  const saveCustomValue = () => {
    const val = customValue.trim();
    if (val && customDialog.type) {
      // Add to session memory so it instantly appears in the dropdown list
      if (customDialog.type === 'paymentMethod') {
        setSessionMethods(prev => [...prev, val]);
      } else if (customDialog.type === 'account') {
        setSessionAccounts(prev => [...prev, val]);
      }
      
      // Force the form to select the newly added value
      form.setValue(customDialog.type, val, { shouldValidate: true, shouldDirty: true });
    }
    setCustomDialog({ isOpen: false, type: null });
    setCustomValue('');
  };

  // Generate unique lists from defaults + past DB data + current session additions
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                     <DatePicker
                        date={field.value ? parseISO(field.value) : undefined}
                        onDateChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" className="dark:[color-scheme:dark]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <CategorySelector selectedCategory={field.value} onCategorySelect={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="items"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="What did you buy?" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="where"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Where</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Vendor or place" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any additional notes..." rows={3} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select 
                        onValueChange={(val) => val === 'NEW' ? setCustomDialog({ isOpen: true, type: 'paymentMethod' }) : field.onChange(val)} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a method" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <FormLabel>Account / Bank</FormLabel>
                      <Select 
                        onValueChange={(val) => val === 'NEW' ? setCustomDialog({ isOpen: true, type: 'account' }) : field.onChange(val)} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

              <div>
                <Label htmlFor="attachments">Attachments</Label>
                <div className="mt-2 flex items-center justify-center w-full">
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    </div>
                    <input id="file-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} multiple />
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {attachments.map((att, i) => {
                    const isPdf = att.startsWith('data:application/pdf');
                    return (
                      <div key={i} className="relative">
                        {isPdf ? (
                          <button
                            type="button"
                            onClick={() => window.open(att, '_blank')}
                            className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-slate-100 p-2 text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/5"
                          >
                            <FileText className="h-6 w-6 text-primary" />
                            <span>View PDF</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => window.open(att, '_blank')}
                            className="block h-20 w-full overflow-hidden rounded-lg"
                          >
                            <img src={att} className="h-full w-full object-cover" alt={`attachment ${i + 1}`} />
                          </button>
                        )}
                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}>
                  {addExpenseMutation.isPending || updateExpenseMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    editingExpense ? 'Update Expense' : 'Save Expense'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Internal Dialog for Custom Values */}
      <Dialog open={customDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setCustomDialog({ isOpen: false, type: null })}>
        <DialogContent className="sm:max-w-xs z-[60]">
          <DialogHeader>
            <DialogTitle>Add New {customDialog.type === 'account' ? 'Bank' : 'Method'}</DialogTitle>
          </DialogHeader>
          <Input 
            value={customValue} 
            onChange={(e) => setCustomValue(e.target.value)} 
            placeholder={`e.g. ${customDialog.type === 'account' ? 'Axis Bank' : 'Crypto'}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Stop the main form from submitting
                saveCustomValue();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialog({ isOpen: false, type: null })}>Cancel</Button>
            <Button type="button" onClick={saveCustomValue}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
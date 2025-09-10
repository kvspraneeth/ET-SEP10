import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CategorySelector } from './category-selector';
import { DatePicker } from './date-picker';
import { useAddExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { expenseFormSchema, Expense } from '@shared/schema';
import { format, parseISO } from 'date-fns';


interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCategory?: string;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, preSelectedCategory, editingExpense }: ExpenseFormProps) {
  const [attachments, setAttachments] = useState<string[]>([]);
  const addExpenseMutation = useAddExpense();
  const updateExpenseMutation = useUpdateExpense();

  const form = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: '' as any,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      category: '',
      items: '',
      where: '',
      note: '',
      paymentMethod: 'UPI' as const,
      account: '' as any,
      isRecurring: false,
      isTemplate: false,
      attachments: [],
      id: '' as any,
    },
  });

  // This effect correctly resets the form state based on the props when the dialog opens.
  useEffect(() => {
    // We only want this effect to run when the dialog is opened.
    if (open) {
      if (editingExpense) {
        // When editing, populate the form with the existing expense data.
        form.reset(editingExpense);
        setAttachments(editingExpense.attachments || []);
      } else {
        // When adding a new expense, reset to default values.
        // Use preSelectedCategory if it's passed as a prop.
        form.reset({
          amount: '' as any,
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          category: preSelectedCategory || '',
          items: '',
          where: '',
          note: '',
          paymentMethod: 'UPI' as const,
          account: '' as any,
          isRecurring: false,
          isTemplate: false,
          attachments: [],
          id: undefined,
        });
        setAttachments([]);
      }
    }
  }, [open, editingExpense, preSelectedCategory, form]); // Corrected dependency array


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachments(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} placeholder="0.00" type="number" step="0.01" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
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

            {/* Time */}
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategorySelector
                      selectedCategory={field.value}
                      onCategorySelect={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Items/Where/Note */}
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

            {/* Payment Method and Account */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ICICI">ICICI</SelectItem>
                        <SelectItem value="HDFC">HDFC</SelectItem>
                        <SelectItem value="SBI">SBI</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            {/* Attachments */}
            <div>
              <Label htmlFor="attachments">Attachments</Label>
              <div className="mt-2 flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  </div>
                  <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} multiple />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative">
                    <img src={att} className="w-full h-20 object-cover rounded" alt={`attachment ${i + 1}`} />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>


            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}>
                {addExpenseMutation.isPending || updateExpenseMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingExpense ? 'Update Expense' : 'Save Expense'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


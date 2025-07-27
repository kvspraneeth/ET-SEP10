import { useState } from 'react';
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
import { useAddExpense } from '@/hooks/use-expenses';
import { expenseFormSchema } from '@shared/schema';
import { format } from 'date-fns';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseForm({ open, onOpenChange }: ExpenseFormProps) {
  const [attachments, setAttachments] = useState<string[]>([]);
  const addExpenseMutation = useAddExpense();

  const form = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      category: '',
      items: '',
      where: '',
      note: '',
      paymentMethod: 'UPI' as const,
      account: 'ICICI' as const,
      isRecurring: false,
      isTemplate: false,
      attachments: [],
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachments(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (data: any) => {
    try {
      await addExpenseMutation.mutateAsync({
        ...data,
        attachments,
      });
      
      // Reset form and close modal
      form.reset();
      setAttachments([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit expense:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setAttachments([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add Expense</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
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
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <CategorySelector
                      selectedCategory={field.value}
                      onCategorySelect={field.onChange}
                      variant="button"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Items/Description */}
            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What did you buy?</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Weekly groceries, Lunch, Movie tickets"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="where"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where?</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Big Bazaar, Restaurant name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Card">Debit/Credit Card</SelectItem>
                      <SelectItem value="Net Banking">Net Banking</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account */}
            <FormField
              control={form.control}
              name="account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ICICI">ICICI Bank</SelectItem>
                      <SelectItem value="SBI">State Bank of India</SelectItem>
                      <SelectItem value="HDFC">HDFC Bank</SelectItem>
                      <SelectItem value="Axis">Axis Bank</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Attachment */}
            <div>
              <Label>Attach Receipt (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-primary transition-colors mt-2">
                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="fileUpload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Tap to upload receipt</p>
                  <p className="text-xs text-gray-400">Images, PDF, DOC (Max 5MB)</p>
                </label>
              </div>
              {attachments.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {attachments.length} file(s) attached
                </p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={addExpenseMutation.isPending}
              >
                {addExpenseMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Expense'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import type { ChangeEvent } from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Download, Upload, Trash2, Pencil, Check, X, ChevronRight, 
  Tags, FileSpreadsheet, Repeat, ArrowRightLeft, Sparkles, Layers, RefreshCw 
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import db, { DebtRecord, RecurringExpense, RecurringDebt } from '@/lib/db';
import { DEFAULT_CATEGORIES, getCategoryColor, findCategory, cleanupAndDeduplicateCategories, isGarbageCategory } from '@/lib/categories';
import { useLiveQuery } from 'dexie-react-hooks';
import { getIconComponent } from '@/components/category-selector';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ManageRecurringExpensesDialog, ManageRecurringDebtsDialog } from '@/components/recurring-manager';
import { processRecurringRules, toCleanDateStr } from '@/lib/recurring-engine';
import { Category } from '@shared/schema';

// A sub-component to handle the Manage Categories Dialog cleanly
function ManageCategoriesDialog({ children }: { children: React.ReactNode }) {
  const rawCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isCleaning, setIsCleaning] = useState(false);

  const categories = useMemo(() => {
    return (rawCategories || []).filter(c => !isGarbageCategory(c));
  }, [rawCategories]);

  const handleCleanUp = async () => {
    setIsCleaning(true);
    try {
      await cleanupAndDeduplicateCategories(db);
      toast({
        title: "Cleaned Up Successfully",
        description: "All corrupted/duplicate categories and UUIDs have been purged and remapped.",
      });
    } catch (e) {
      toast({ title: "Failed to clean categories", variant: "destructive" });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the "${name}" category?`)) {
      try {
        await db.categories.delete(id);
        toast({ title: "Category deleted" });
      } catch (e) {
        toast({ title: "Failed to delete category", variant: "destructive" });
      }
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await db.categories.update(id, { 
        name: editName.trim(), 
        updatedAt: new Date()
      });
      setEditingId(null);
      toast({ title: "Category updated successfully" });
    } catch (e) {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setEditingId(null);
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Manage Categories ({categories.length})</DialogTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCleanUp}
              disabled={isCleaning}
              className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Clean Duplicates</span>
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 mt-4 pb-4">
          {categories.map((category: Category) => {
            const colors = getCategoryColor(category.color);
            const isEditing = editingId === category.id;

            return (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-800">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(category.id)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-2 rounded-full shrink-0 ${colors.bg} ${colors.text}`}>
                      {getIconComponent(category.icon, "w-4 h-4")}
                    </div>
                    <span className="font-medium truncate">{category.name}</span>
                    {category.isDefault && (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider ml-1 border px-1.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleSaveEdit(category.id)}
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setEditingId(null)}
                        className="h-8 w-8 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingId(category.id); setEditName(category.name); }}
                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      
                      {!category.isDefault && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Settings() {
  const settings = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [isRecurringExpensesOpen, setIsRecurringExpensesOpen] = useState(false);
  const [isRecurringDebtsOpen, setIsRecurringDebtsOpen] = useState(false);

  const recurringExpensesCount = useLiveQuery(() => db.recurringExpenses.count()) || 0;
  const recurringDebtsCount = useLiveQuery(() => db.recurringDebts.count()) || 0;

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await updateSettingsMutation.mutateAsync({ [key]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const exportData = async () => {
    try {
      const expenses = await db.expenses.toArray();
      const budgets = await db.budgets.toArray();
      const categories = await db.categories.toArray();
      const debts = await db.debts.toArray();
      const recurringExpenses = await db.recurringExpenses.toArray();
      const recurringDebts = await db.recurringDebts.toArray();
      
      const data = {
        expenses,
        budgets,
        categories,
        debts,
        recurringExpenses,
        recurringDebts,
        settings,
        exportDate: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Complete backup exported successfully (including Dues & Recurring)!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = async () => {
    try {
      const expenses = await db.expenses.toArray();
      const budgets = await db.budgets.toArray();
      const categories = await db.categories.toArray();
      const debts = await db.debts.toArray();
      const recurringExpenses = await db.recurringExpenses.toArray();
      const recurringDebts = await db.recurringDebts.toArray();

      const workbook = new ExcelJS.Workbook();

      // 1. Expenses sheet
      const expensesSheet = workbook.addWorksheet('Expenses');
      expensesSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Items', key: 'items', width: 30 },
        { header: 'Location', key: 'where', width: 20 },
        { header: 'Payment Method', key: 'paymentMethod', width: 15 },
        { header: 'Account', key: 'account', width: 15 },
        { header: 'Notes', key: 'note', width: 30 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Recurring Rule ID', key: 'recurringRuleId', width: 25 },
        { header: 'Is Recurring', key: 'isRecurring', width: 15 },
      ];
      expenses.forEach(exp => {
        const cat = findCategory(categories, exp.category);
        expensesSheet.addRow({
          date: exp.date,
          time: exp.time,
          amount: exp.amount,
          category: cat?.name || exp.category,
          items: exp.items,
          where: exp.where || '',
          paymentMethod: exp.paymentMethod,
          account: (exp as any).account || 'ICICI',
          note: exp.note || '',
          createdAt: exp.createdAt,
          recurringRuleId: exp.recurringRuleId || '',
          isRecurring: exp.isRecurring ? 'Yes' : 'No',
        });
      });

      // 2. Dues & Receivables sheet
      const debtsSheet = workbook.addWorksheet('Dues & Receivables');
      debtsSheet.columns = [
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Person Name', key: 'personName', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Purpose', key: 'purpose', width: 25 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Date Time', key: 'datetime', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Recurring Rule ID', key: 'recurringRuleId', width: 25 },
      ];
      debts.forEach(d => debtsSheet.addRow({
        type: d.type === 'due' ? 'Due (To Pay)' : 'Receivable (To Get)',
        personName: d.personName,
        amount: d.amount,
        purpose: d.purpose,
        location: d.location || '',
        status: d.status,
        datetime: d.datetime,
        notes: d.notes || '',
        createdAt: d.createdAt,
        recurringRuleId: d.recurringRuleId || '',
      }));

      // 3. Recurring Expenses sheet
      const recExpSheet = workbook.addWorksheet('Recurring Expenses');
      recExpSheet.columns = [
        { header: 'Title', key: 'items', width: 25 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Frequency', key: 'frequency', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Last Generated Date', key: 'lastGeneratedDate', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Location', key: 'where', width: 20 },
        { header: 'Payment Method', key: 'paymentMethod', width: 15 },
        { header: 'Account', key: 'account', width: 15 },
        { header: 'Note', key: 'note', width: 30 },
        { header: 'ID', key: 'id', width: 25 },
      ];
      recurringExpenses.forEach(r => {
        const cat = findCategory(categories, r.category);
        recExpSheet.addRow({
          items: r.items,
          amount: r.amount,
          category: cat?.name || r.category,
          frequency: r.frequency,
          startDate: r.startDate,
          endDate: r.endDate || 'Forever',
          lastGeneratedDate: r.lastGeneratedDate || '',
          status: r.isActive ? 'Active' : 'Stopped',
          where: r.where || '',
          paymentMethod: r.paymentMethod,
          account: r.account,
          note: r.note || '',
          id: r.id,
        });
      });

      // 4. Recurring Dues sheet
      const recDebtSheet = workbook.addWorksheet('Recurring Dues');
      recDebtSheet.columns = [
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Person Name', key: 'personName', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Purpose', key: 'purpose', width: 25 },
        { header: 'Frequency', key: 'frequency', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Last Generated Date', key: 'lastGeneratedDate', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'ID', key: 'id', width: 25 },
      ];
      recurringDebts.forEach(r => recDebtSheet.addRow({
        type: r.type === 'due' ? 'Due (To Pay)' : 'Receivable (To Get)',
        personName: r.personName,
        amount: r.amount,
        purpose: r.purpose,
        frequency: r.frequency,
        startDate: r.startDate,
        endDate: r.endDate || 'Forever',
        lastGeneratedDate: r.lastGeneratedDate || '',
        status: r.isActive ? 'Active' : 'Stopped',
        location: r.location || '',
        notes: r.notes || '',
        id: r.id,
      }));

      // 5. Budgets sheet
      const budgetsSheet = workbook.addWorksheet('Budgets');
      budgetsSheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Period', key: 'period', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'Is Active', key: 'isActive', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 20 },
      ];
      budgets.forEach(b => {
        const cat = findCategory(categories, b.category);
        budgetsSheet.addRow({
          name: b.name,
          amount: b.amount,
          category: cat?.name || b.category,
          period: b.period,
          startDate: b.startDate,
          isActive: b.isActive ? 'Yes' : 'No',
          createdAt: (b as any).createdAt || new Date().toISOString(),
        });
      });

      // 6. Categories sheet
      const categoriesSheet = workbook.addWorksheet('Categories');
      categoriesSheet.columns = [
        { header: 'ID', key: 'id', width: 20 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Icon', key: 'icon', width: 15 },
        { header: 'Color', key: 'color', width: 15 },
        { header: 'Is Default', key: 'isDefault', width: 10 },
      ];
      categories.forEach(c => categoriesSheet.addRow({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isDefault: c.isDefault ? 'Yes' : 'No',
      }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Excel file exported with all sheets (Expenses, Dues, Recurring Expenses, Recurring Dues, Budgets)!",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to export Excel file.",
        variant: "destructive",
      });
    }
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (confirm('This will replace all your current data with the imported file. Are you sure?')) {
          await db.expenses.clear();
          await db.budgets.clear();
          await db.categories.clear();
          await db.debts.clear();
          await db.recurringExpenses.clear();
          await db.recurringDebts.clear();

          // Ensure default categories exist
          await db.categories.bulkAdd(DEFAULT_CATEGORIES);
          
          if (data.categories) {
            for (const cat of data.categories) {
              if (isGarbageCategory(cat)) continue;
              const existing = await db.categories.get(cat.id);
              if (!existing) await db.categories.add(cat);
            }
          }

          if (data.expenses) await db.expenses.bulkAdd(data.expenses);
          if (data.budgets) await db.budgets.bulkAdd(data.budgets);
          if (data.debts) await db.debts.bulkAdd(data.debts);
          if (data.recurringExpenses) await db.recurringExpenses.bulkAdd(data.recurringExpenses);
          if (data.recurringDebts) await db.recurringDebts.bulkAdd(data.recurringDebts);
          if (data.settings) await updateSettingsMutation.mutateAsync(data.settings);
          
          await cleanupAndDeduplicateCategories(db);
          await processRecurringRules();

          toast({
            title: "Success",
            description: "All data (expenses, dues, recurring schedules, budgets) imported successfully!",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const importFromExcel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const getStr = (val: any): string => {
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') {
            if (val.text !== undefined) return String(val.text).trim();
            if (val.result !== undefined) return String(val.result).trim();
            if (val instanceof Date) return format(val, 'yyyy-MM-dd');
            if (Array.isArray(val)) return val.map(v => getStr(v)).join(' ');
          }
          return String(val).trim();
        };

        const getNum = (val: any): number => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'object') {
            if (val.result !== undefined) return Number(val.result) || 0;
            if (val.text !== undefined) return Number(val.text) || 0;
          }
          const n = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
          return isNaN(n) ? 0 : n;
        };

        if (confirm('This will replace all your current data with the imported Excel workbook. Are you sure?')) {
          await db.expenses.clear();
          await db.budgets.clear();
          await db.categories.clear();
          await db.debts.clear();
          await db.recurringExpenses.clear();
          await db.recurringDebts.clear();

          // 1. Seed DEFAULT_CATEGORIES first
          const loadedCategories: any[] = [...DEFAULT_CATEGORIES];
          await db.categories.bulkAdd(DEFAULT_CATEGORIES);

          // 2. Load Categories Sheet if present (with dynamic column detection)
          const categoriesSheet = workbook.getWorksheet('Categories');
          if (categoriesSheet) {
            const extraCategories: any[] = [];
            const headerRow = categoriesSheet.getRow(1);
            let idCol = -1, nameCol = -1, iconCol = -1, colorCol = -1, defaultCol = -1;
            
            for (let c = 1; c <= (headerRow.cellCount || 5); c++) {
              const h = getStr(headerRow.getCell(c).value).toLowerCase();
              if (h === 'id') idCol = c;
              else if (h.includes('name') || h.includes('category')) nameCol = c;
              else if (h.includes('icon')) iconCol = c;
              else if (h.includes('color')) colorCol = c;
              else if (h.includes('default')) defaultCol = c;
            }

            if (nameCol === -1) {
              nameCol = idCol === 1 ? 2 : 1;
            }
            if (iconCol === -1) iconCol = nameCol === 1 ? 2 : 3;
            if (colorCol === -1) colorCol = iconCol + 1;
            if (defaultCol === -1) defaultCol = colorCol + 1;

            for (let rowNumber = 2; rowNumber <= categoriesSheet.rowCount; rowNumber++) {
              const row = categoriesSheet.getRow(rowNumber);
              const IdVal = idCol > 0 ? getStr(row.getCell(idCol).value) : '';
              const Name = getStr(row.getCell(nameCol).value);
              const Icon = iconCol > 0 ? getStr(row.getCell(iconCol).value) : 'tag';
              const Color = colorCol > 0 ? getStr(row.getCell(colorCol).value) : 'gray';
              const IsDefault = defaultCol > 0 ? getStr(row.getCell(defaultCol).value) : 'false';

              if (!Name || isGarbageCategory({ id: IdVal, name: Name, icon: Icon })) continue;

              const cleanName = Name.trim();
              const catId = (IdVal && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(IdVal)) 
                ? IdVal.toLowerCase() 
                : cleanName.toLowerCase().replace(/\s+/g, '-');

              if (!loadedCategories.some(c => c.id.toLowerCase() === catId.toLowerCase() || c.name.toLowerCase() === cleanName.toLowerCase())) {
                const newCat = {
                  id: catId,
                  userId: 'local',
                  name: cleanName,
                  icon: Icon || 'tag',
                  color: Color || 'gray',
                  isDefault: IsDefault.toLowerCase() === 'yes' || IsDefault === 'true',
                  updatedAt: new Date(),
                };
                extraCategories.push(newCat);
                loadedCategories.push(newCat);
              }
            }
            if (extraCategories.length > 0) {
              await db.categories.bulkAdd(extraCategories);
            }
          }

          // Helper to resolve and register any unknown genuine category
          const resolveCategory = async (rawCategory: string): Promise<string> => {
            if (!rawCategory) return 'groceries';
            const resolved = findCategory(loadedCategories, rawCategory);
            if (!isGarbageCategory(resolved) && !loadedCategories.some(c => c.id.toLowerCase() === resolved.id.toLowerCase() || c.name.toLowerCase() === resolved.name.toLowerCase())) {
              loadedCategories.push(resolved);
              await db.categories.add(resolved);
            }
            return resolved.id;
          };

          // 3. Expenses Sheet
          const expensesSheet = workbook.getWorksheet('Expenses');
          if (expensesSheet) {
            const expenses: any[] = [];
            for (let rowNumber = 2; rowNumber <= expensesSheet.rowCount; rowNumber++) {
              const row = expensesSheet.getRow(rowNumber);
              const DateVal = getStr(row.getCell(1).value);
              const TimeVal = getStr(row.getCell(2).value);
              const Amount = getNum(row.getCell(3).value);
              const CategoryVal = getStr(row.getCell(4).value);
              const Items = getStr(row.getCell(5).value);
              const Location = getStr(row.getCell(6).value);
              const PaymentMethod = getStr(row.getCell(7).value);
              const Account = getStr(row.getCell(8).value);
              const Notes = getStr(row.getCell(9).value);
              const CreatedAt = getStr(row.getCell(10).value);
              const RecurringRuleId = getStr(row.getCell(11).value);
              const IsRecurring = getStr(row.getCell(12).value);

              if (!Items && Amount <= 0) continue;

              const cleanCatId = await resolveCategory(CategoryVal);

              expenses.push({
                id: crypto.randomUUID(),
                date: DateVal ? DateVal.split('T')[0] : new Date().toISOString().split('T')[0],
                time: TimeVal || '00:00',
                amount: Amount || 0,
                category: cleanCatId,
                items: Items || '',
                where: Location || '',
                paymentMethod: PaymentMethod || 'UPI',
                account: Account || 'ICICI',
                note: Notes || '',
                isRecurring: IsRecurring.toLowerCase() === 'yes' || IsRecurring === 'true' || Boolean(RecurringRuleId),
                isTemplate: false,
                recurringRuleId: RecurringRuleId || undefined,
                attachments: [],
                createdAt: CreatedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            if (expenses.length > 0) await db.expenses.bulkAdd(expenses);
          }

          // 4. Dues & Receivables Sheet
          const debtsSheet = workbook.getWorksheet('Dues & Receivables');
          if (debtsSheet) {
            const debts: any[] = [];
            debtsSheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;
              const TypeVal = getStr(row.getCell(1).value);
              const PersonName = getStr(row.getCell(2).value);
              const Amount = getNum(row.getCell(3).value);
              const Purpose = getStr(row.getCell(4).value);
              const Location = getStr(row.getCell(5).value);
              const Status = getStr(row.getCell(6).value);
              const DateTimeVal = getStr(row.getCell(7).value);
              const Notes = getStr(row.getCell(8).value);
              const CreatedAt = getStr(row.getCell(9).value);
              const RecurringRuleId = getStr(row.getCell(10).value);

              if (!PersonName && Amount <= 0) return;

              debts.push({
                type: TypeVal.toLowerCase().includes('due') ? 'due' : 'receivable',
                personName: PersonName || 'Unknown',
                amount: Amount || 0,
                purpose: Purpose || 'Debt',
                location: Location || undefined,
                status: Status.toLowerCase() === 'settled' ? 'settled' : 'pending',
                datetime: DateTimeVal || new Date().toISOString(),
                notes: Notes || undefined,
                recurringRuleId: RecurringRuleId || undefined,
                createdAt: CreatedAt || new Date().toISOString(),
              });
            });
            if (debts.length > 0) await db.debts.bulkAdd(debts);
          }

          // 5. Recurring Expenses Sheet
          const recExpSheet = workbook.getWorksheet('Recurring Expenses');
          if (recExpSheet) {
            const recExpenses: any[] = [];
            for (let rowNumber = 2; rowNumber <= recExpSheet.rowCount; rowNumber++) {
              const row = recExpSheet.getRow(rowNumber);
              const Items = getStr(row.getCell(1).value);
              const Amount = getNum(row.getCell(2).value);
              const CategoryVal = getStr(row.getCell(3).value);
              const FrequencyVal = getStr(row.getCell(4).value);
              const StartDate = getStr(row.getCell(5).value);
              const EndDate = getStr(row.getCell(6).value);
              const LastGenDate = getStr(row.getCell(7).value);
              const Status = getStr(row.getCell(8).value);
              const Location = getStr(row.getCell(9).value);
              const PaymentMethod = getStr(row.getCell(10).value);
              const Account = getStr(row.getCell(11).value);
              const Notes = getStr(row.getCell(12).value);
              const IdVal = getStr(row.getCell(13).value);

              if (!Items || Amount <= 0) continue;

              const cleanCatId = await resolveCategory(CategoryVal);
              const freqNormalized = FrequencyVal.toLowerCase().trim();
              let validFrequency = 'monthly';
              if (freqNormalized.includes('day') || freqNormalized.includes('daily')) validFrequency = 'daily';
              else if (freqNormalized.includes('week')) validFrequency = 'weekly';
              else if (freqNormalized.includes('year') || freqNormalized.includes('annual')) validFrequency = 'yearly';
              else if (freqNormalized.includes('custom')) validFrequency = 'custom';

              const cleanStartDate = StartDate ? StartDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
              const todayStr = format(new Date(), 'yyyy-MM-dd');

              // If last generated date is present in Excel, preserve it.
              // If not present, default to todayStr (if startDate was in the past) so we DO NOT backfill duplicate daily records!
              let effectiveLastGen: string | undefined = undefined;
              if (LastGenDate && LastGenDate !== 'Never' && LastGenDate.length >= 10) {
                effectiveLastGen = LastGenDate.split('T')[0];
              } else if (cleanStartDate <= todayStr) {
                effectiveLastGen = todayStr;
              }

              recExpenses.push({
                id: IdVal || crypto.randomUUID(),
                items: Items,
                amount: Amount,
                category: cleanCatId,
                frequency: validFrequency as any,
                startDate: cleanStartDate,
                endDate: EndDate && EndDate !== 'Forever' ? EndDate.split('T')[0] : undefined,
                lastGeneratedDate: effectiveLastGen,
                isActive: Status.toLowerCase() !== 'stopped' && Status.toLowerCase() !== 'false',
                where: Location || undefined,
                paymentMethod: PaymentMethod || 'UPI',
                account: Account || 'ICICI',
                note: Notes || undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            if (recExpenses.length > 0) await db.recurringExpenses.bulkAdd(recExpenses);
          }

          // 6. Recurring Dues Sheet
          const recDebtSheet = workbook.getWorksheet('Recurring Dues');
          if (recDebtSheet) {
            const recDebts: any[] = [];
            recDebtSheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;
              const TypeVal = getStr(row.getCell(1).value);
              const PersonName = getStr(row.getCell(2).value);
              const Amount = getNum(row.getCell(3).value);
              const Purpose = getStr(row.getCell(4).value);
              const FrequencyVal = getStr(row.getCell(5).value);
              const StartDate = getStr(row.getCell(6).value);
              const EndDate = getStr(row.getCell(7).value);
              const LastGenDate = getStr(row.getCell(8).value);
              const Status = getStr(row.getCell(9).value);
              const Location = getStr(row.getCell(10).value);
              const Notes = getStr(row.getCell(11).value);
              const IdVal = getStr(row.getCell(12).value);

              if (!PersonName || Amount <= 0) return;

              const freqNormalized = FrequencyVal.toLowerCase().trim();
              let validFrequency = 'monthly';
              if (freqNormalized.includes('day') || freqNormalized.includes('daily')) validFrequency = 'daily';
              else if (freqNormalized.includes('week')) validFrequency = 'weekly';
              else if (freqNormalized.includes('year') || freqNormalized.includes('annual')) validFrequency = 'yearly';
              else if (freqNormalized.includes('custom')) validFrequency = 'custom';

              const cleanStartDate = StartDate ? StartDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
              const todayStr = format(new Date(), 'yyyy-MM-dd');

              let effectiveLastGen: string | undefined = undefined;
              if (LastGenDate && LastGenDate !== 'Never' && LastGenDate.length >= 10) {
                effectiveLastGen = LastGenDate.split('T')[0];
              } else if (cleanStartDate <= todayStr) {
                effectiveLastGen = todayStr;
              }

              recDebts.push({
                id: IdVal || crypto.randomUUID(),
                type: TypeVal.toLowerCase().includes('due') ? 'due' : 'receivable',
                personName: PersonName,
                amount: Amount,
                purpose: Purpose || 'Recurring Debt',
                frequency: validFrequency as any,
                startDate: cleanStartDate,
                endDate: EndDate && EndDate !== 'Forever' ? EndDate.split('T')[0] : undefined,
                lastGeneratedDate: effectiveLastGen,
                isActive: Status.toLowerCase() !== 'stopped' && Status.toLowerCase() !== 'false',
                location: Location || undefined,
                notes: Notes || undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            });
            if (recDebts.length > 0) await db.recurringDebts.bulkAdd(recDebts);
          }

          // 7. Budgets Sheet
          const budgetsSheet = workbook.getWorksheet('Budgets');
          if (budgetsSheet) {
            const budgets: any[] = [];
            for (let rowNumber = 2; rowNumber <= budgetsSheet.rowCount; rowNumber++) {
              const row = budgetsSheet.getRow(rowNumber);
              const Name = getStr(row.getCell(1).value);
              const Amount = getNum(row.getCell(2).value);
              const CategoryVal = getStr(row.getCell(3).value);
              const Period = getStr(row.getCell(4).value);
              const StartDate = getStr(row.getCell(5).value);
              const IsActive = getStr(row.getCell(6).value);
              const CreatedAt = getStr(row.getCell(7).value);

              if (!Name && Amount <= 0) continue;

              const cleanCatId = await resolveCategory(CategoryVal);

              budgets.push({
                id: crypto.randomUUID(),
                name: Name || 'Budget',
                amount: Amount || 0,
                category: cleanCatId,
                period: Period || 'monthly',
                startDate: StartDate || new Date().toISOString().split('T')[0],
                isActive: IsActive.toLowerCase() === 'yes' || IsActive === 'true',
                createdAt: CreatedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            if (budgets.length > 0) await db.budgets.bulkAdd(budgets);
          }

          // Clean and deduplicate all categories
          await cleanupAndDeduplicateCategories(db);

          // Trigger recurring engine for any pending future rule
          await processRecurringRules();

          toast({
            title: "Success",
            description: "Excel workbook data (Expenses, Dues, Recurring Schedules, Budgets, Categories) imported successfully!",
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to import Excel file. Please check the sheet format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const clearAllData = async () => {
    if (confirm('This will permanently delete all your expenses, dues, recurring schedules, and budgets. Are you sure?')) {
      try {
        await db.expenses.clear();
        await db.budgets.clear();
        await db.categories.clear();
        await db.debts.clear();
        await db.recurringExpenses.clear();
        await db.recurringDebts.clear();
        await db.categories.bulkAdd(DEFAULT_CATEGORIES);
        
        await updateSettingsMutation.mutateAsync({
          currency: '₹',
          theme: 'light',
          language: 'en',
          notifications: true,
          budgetAlerts: true,
        });
        
        toast({
          title: "Success",
          description: "All data cleared successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to clear data.",
          variant: "destructive",
        });
      }
    }
  };

  if (!settings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Preferences & Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your app experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="dark-mode" className="text-base cursor-pointer">Dark Mode</Label>
            <Switch 
              id="dark-mode" 
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manage Expenses, Recurring & Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Manage Expenses & Automation</span>
          </CardTitle>
          <CardDescription>Configure categories, recurring expenses, and recurring dues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          
          {/* Manage Recurring Expenses */}
          <Button 
            variant="outline" 
            onClick={() => setIsRecurringExpensesOpen(true)}
            className="w-full justify-between font-normal h-12 text-base hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                <Repeat className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-sm">Manage Recurring Expenses</span>
                <p className="text-[11px] text-muted-foreground">Auto-log daily, monthly, or custom expenses</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {recurringExpensesCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                  {recurringExpensesCount} active
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Button>

          {/* Manage Recurring Dues */}
          <Button 
            variant="outline" 
            onClick={() => setIsRecurringDebtsOpen(true)}
            className="w-full justify-between font-normal h-12 text-base hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/10 p-1.5 rounded-md text-amber-600 dark:text-amber-400">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-sm">Manage Recurring Dues & Receivables</span>
                <p className="text-[11px] text-muted-foreground">Auto-log recurring debts and allowances</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {recurringDebtsCount > 0 && (
                <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                  {recurringDebtsCount} active
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Button>

          {/* Manage Categories */}
          <ManageCategoriesDialog>
            <Button 
              variant="outline" 
              className="w-full justify-between font-normal h-12 text-base hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-1.5 rounded-md text-green-600 dark:text-green-400">
                  <Tags className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-sm">Manage Categories</span>
                  <p className="text-[11px] text-muted-foreground">Customize colors, icons, and labels</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Button>
          </ManageCategoriesDialog>

        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management & Backup</CardTitle>
          <CardDescription>Export and import your complete offline records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* JSON Export/Import */}
          <div>
            <h4 className="font-medium mb-2 text-sm">JSON Full Backup</h4>
            <div className="space-y-2">
              <Button onClick={exportData} variant="outline" className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export as JSON (Includes Dues & Recurring)
              </Button>
              
              <Label htmlFor="import-json-file">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import from JSON
                  </span>
                </Button>
              </Label>
              <input
                id="import-json-file"
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              JSON format preserves all data: expenses, dues, recurring rules, and settings
            </p>
          </div>

          <Separator />

          {/* Excel Export/Import */}
          <div>
            <h4 className="font-medium mb-2 text-sm">Excel Spreadsheet Format</h4>
            <div className="space-y-2">
              <Button onClick={exportToExcel} variant="outline" className="w-full justify-start">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel (Multi-Sheet)
              </Button>
              
              <Label htmlFor="import-excel-file">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <span>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Import from Excel
                  </span>
                </Button>
              </Label>
              <input
                id="import-excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={importFromExcel}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Excel format with separate sheets for Expenses, Dues & Receivables, Recurring, and Budgets
            </p>
          </div>

          <Separator />

          {/* Clear All Data */}
          <div>
            <Button
              onClick={clearAllData}
              variant="destructive"
              className="w-full justify-start"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently delete all expenses, dues, recurring schedules, and reset settings
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <div className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 flex items-center space-x-2">
          <span>Made with</span>
          <span className="text-red-500">❤️</span>
          <span>by Jack</span>
        </div>
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Version</span>
              <span>2.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Build</span>
              <span>PWA Offline-First</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Storage</span>
              <span>IndexedDB (Dexie v3)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Dialogs */}
      <ManageRecurringExpensesDialog
        open={isRecurringExpensesOpen}
        onOpenChange={setIsRecurringExpensesOpen}
      />
      <ManageRecurringDebtsDialog
        open={isRecurringDebtsOpen}
        onOpenChange={setIsRecurringDebtsOpen}
      />
    </div>
  );
}
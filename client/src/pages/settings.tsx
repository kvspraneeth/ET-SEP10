import type { ChangeEvent } from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Download, Upload, Trash2, Pencil, Check, X, ChevronRight, ChevronDown,
  Tags, FileSpreadsheet, Repeat, ArrowRightLeft, Sparkles, Layers, RefreshCw,
  Bell, Zap, AlertTriangle, Clock, Palette, Type, Plus, Sun, Moon,
  Sliders, Shield, SlidersHorizontal, SlidersVertical, Search, Globe, Coins, LayoutGrid, CheckCircle,
  Smartphone, Wallet
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useNotificationActions } from '@/hooks/use-notifications';
import {
  useTheme,
  THEME_OPTIONS,
  LIGHT_THEMES,
  DARK_THEMES,
  PRIMARY_COLOR_OPTIONS,
  GRADIENT_PRESETS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  type Theme,
  type PrimaryColor,
  type FontFamily,
  type FontSize,
  type CustomGradient
} from '@/components/theme-provider';
import { POPULAR_CURRENCIES, ALL_CURRENCIES, searchCurrencies, findCurrencyInfo, type CurrencyInfo } from '@/lib/currencies';
import { useToast } from '@/hooks/use-toast';
import db, { DebtRecord, RecurringExpense, RecurringDebt, RecurrenceFrequency, CustomIntervalUnit } from '@/lib/db';
import { DEFAULT_CATEGORIES, getCategoryColor, findCategory, cleanupAndDeduplicateCategories, isGarbageCategory, normalizeCategoryKey, guessCategoryProperties } from '@/lib/categories';
import { useLiveQuery } from 'dexie-react-hooks';
import { getIconComponent, AddCategoryDialog } from '@/components/category-selector';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ManageRecurringExpensesDialog, ManageRecurringDebtsDialog } from '@/components/recurring-manager';
import { processRecurringRules, toCleanDateStr } from '@/lib/recurring-engine';
import { Category } from '@shared/schema';
import { InfoButton } from '@/components/info-button';

// A sub-component to handle the Manage Categories Dialog cleanly
function ManageCategoriesDialog({ children }: { children: React.ReactNode }) {
  const rawCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
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
        description: "All duplicate categories and UUIDs have been purged and remapped.",
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 z-50">
          <DialogHeader className="p-4 border-b border-border pr-11 sm:pr-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">Manage Categories ({categories.length})</DialogTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsAddEditDialogOpen(true);
                  }}
                  className="gap-1 text-xs text-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCleanUp}
                  disabled={isCleaning}
                  className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Clean</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {categories.map((category: Category) => {
              const colors = getCategoryColor(category.color);

              return (
                <div key={category.id} className="flex items-center justify-between p-2.5 border rounded-2xl border-border hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
                    <div className={`p-2 rounded-xl shrink-0 ${colors.bg} ${colors.text}`}>
                      {getIconComponent(category.icon, "w-4 h-4")}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs sm:text-sm truncate block text-foreground">{category.name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{category.color} · {category.icon}</span>
                    </div>
                    {category.isDefault && (
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider ml-1 border px-1.5 py-0.5 rounded-full shrink-0">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingCategory(category);
                        setIsAddEditDialogOpen(true);
                      }}
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                      title="Edit Category"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    {!category.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Category Dialog with Icon & Color Picker */}
      <AddCategoryDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        initialCategory={editingCategory}
      />
    </>
  );
}

export function Settings() {
  const settings = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    customHex,
    setCustomHex,
    customGradient,
    setCustomGradient,
    gradientPreset,
    setGradientPreset,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize
  } = useTheme();
  const { toast } = useToast();
  const { requestPermission, sendTestNotification } = useNotificationActions();

  // Minimizable / Collapsible Accordion Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    automation: true, // Top section open by default
    theme: false,
    notifications: false,
    preferences: false,
    backup: false,
    danger: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Currency Search & Custom Currency State
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [customCurrencyInput, setCustomCurrencyInput] = useState('');

  const filteredCurrencies = useMemo(() => {
    return searchCurrencies(currencySearchQuery);
  }, [currencySearchQuery]);

  const activeCurrencyInfo = useMemo(() => {
    return findCurrencyInfo(settings?.currency || '₹');
  }, [settings?.currency]);

  const [isRecurringExpensesOpen, setIsRecurringExpensesOpen] = useState(false);
  const [isRecurringDebtsOpen, setIsRecurringDebtsOpen] = useState(false);
  const [themeTab, setThemeTab] = useState<'light' | 'dark'>('light');

  const recurringExpensesCount = useLiveQuery(() => db.recurringExpenses.count()) || 0;
  const recurringDebtsCount = useLiveQuery(() => db.recurringDebts.count()) || 0;

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
        version: '3.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-pilot-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Exported",
        description: "Full JSON backup downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export database.",
        variant: "destructive",
      });
    }
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.expenses && Array.isArray(data.expenses)) {
        await db.transaction('rw', [db.expenses, db.budgets, db.categories, db.debts, db.recurringExpenses, db.recurringDebts, db.settings], async () => {
          await db.expenses.clear();
          await db.budgets.clear();
          await db.categories.clear();
          await db.debts.clear();
          await db.recurringExpenses.clear();
          await db.recurringDebts.clear();

          if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);
          if (data.budgets?.length) await db.budgets.bulkAdd(data.budgets);
          if (data.categories?.length) await db.categories.bulkAdd(data.categories);
          if (data.debts?.length) await db.debts.bulkAdd(data.debts);
          if (data.recurringExpenses?.length) await db.recurringExpenses.bulkAdd(data.recurringExpenses);
          if (data.recurringDebts?.length) await db.recurringDebts.bulkAdd(data.recurringDebts);
          if (data.settings) await db.settings.put(data.settings);
        });

        toast({
          title: "Import Successful",
          description: `Restored ${data.expenses?.length || 0} expenses & complete data.`,
        });
      } else {
        throw new Error('Invalid backup file format');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Please provide a valid Budget Pilot backup file.",
        variant: "destructive",
      });
    }

    event.target.value = '';
  };

  const exportToExcel = async () => {
    try {
      const expenses = await db.expenses.toArray();
      const debts = await db.debts.toArray();
      const recurringExpenses = await db.recurringExpenses.toArray();
      const recurringDebts = await db.recurringDebts.toArray();
      const budgets = await db.budgets.toArray();
      const customCategories = await db.categories.toArray();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Budget Pilot V3';
      workbook.created = new Date();

      // 1. Expenses Sheet
      const expSheet = workbook.addWorksheet('Expenses');
      expSheet.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Item / Purpose', key: 'items', width: 28 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Payment Method', key: 'paymentMethod', width: 16 },
        { header: 'Account', key: 'account', width: 16 },
        { header: 'Location / Where', key: 'where', width: 20 },
        { header: 'Notes', key: 'note', width: 25 },
      ];
      expenses.forEach(e => {
        expSheet.addRow({
          date: e.date,
          time: e.time,
          items: e.items,
          category: e.category,
          amount: Number(e.amount),
          paymentMethod: e.paymentMethod,
          account: e.account,
          where: e.where || '',
          note: e.note || '',
        });
      });

      // 2. Debts & Receivables Sheet
      const debtSheet = workbook.addWorksheet('Dues & Receivables');
      debtSheet.columns = [
        { header: 'Type', key: 'type', width: 16 },
        { header: 'Person', key: 'personName', width: 22 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Purpose', key: 'purpose', width: 24 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Date', key: 'date', width: 16 },
        { header: 'Location', key: 'location', width: 18 },
        { header: 'Notes', key: 'notes', width: 25 },
      ];
      debts.forEach(d => {
        debtSheet.addRow({
          type: d.type === 'due' ? 'Due (To Pay)' : 'Receivable (To Get)',
          personName: d.personName,
          amount: Number(d.amount),
          purpose: d.purpose,
          status: d.status,
          date: d.datetime,
          location: d.location || '',
          notes: d.notes || '',
        });
      });

      // 3. Recurring Expenses Sheet
      const recExpSheet = workbook.addWorksheet('Recurring Expenses');
      recExpSheet.columns = [
        { header: 'Item / Purpose', key: 'items', width: 26 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Frequency', key: 'frequency', width: 16 },
        { header: 'Interval Count', key: 'customIntervalCount', width: 14 },
        { header: 'Interval Unit', key: 'customIntervalUnit', width: 14 },
        { header: 'Payment Method', key: 'paymentMethod', width: 16 },
        { header: 'Account', key: 'account', width: 16 },
        { header: 'Start Date', key: 'startDate', width: 14 },
        { header: 'End Date', key: 'endDate', width: 14 },
        { header: 'Location / Where', key: 'where', width: 18 },
        { header: 'Notes', key: 'note', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
      ];
      recurringExpenses.forEach(r => {
        recExpSheet.addRow({
          items: r.items,
          amount: Number(r.amount),
          category: r.category,
          frequency: r.frequency,
          customIntervalCount: r.customIntervalCount || 1,
          customIntervalUnit: r.customIntervalUnit || 'months',
          paymentMethod: r.paymentMethod,
          account: r.account,
          startDate: r.startDate,
          endDate: r.endDate || '',
          where: r.where || '',
          note: r.note || '',
          status: r.isActive ? 'Active' : 'Paused',
        });
      });

      // 4. Recurring Dues & Receivables Sheet
      const recDebtSheet = workbook.addWorksheet('Recurring Dues');
      recDebtSheet.columns = [
        { header: 'Type', key: 'type', width: 16 },
        { header: 'Person', key: 'personName', width: 22 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Purpose', key: 'purpose', width: 24 },
        { header: 'Frequency', key: 'frequency', width: 16 },
        { header: 'Interval Count', key: 'customIntervalCount', width: 14 },
        { header: 'Interval Unit', key: 'customIntervalUnit', width: 14 },
        { header: 'Start Date', key: 'startDate', width: 14 },
        { header: 'End Date', key: 'endDate', width: 14 },
        { header: 'Location', key: 'location', width: 18 },
        { header: 'Notes', key: 'notes', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
      ];
      recurringDebts.forEach(r => {
        recDebtSheet.addRow({
          type: r.type === 'due' ? 'Due (To Pay)' : 'Receivable (To Get)',
          personName: r.personName,
          amount: Number(r.amount),
          purpose: r.purpose,
          frequency: r.frequency,
          customIntervalCount: r.customIntervalCount || 1,
          customIntervalUnit: r.customIntervalUnit || 'months',
          startDate: r.startDate,
          endDate: r.endDate || '',
          location: r.location || '',
          notes: r.notes || '',
          status: r.isActive ? 'Active' : 'Paused',
        });
      });

      // 5. Budgets Sheet
      const budgetSheet = workbook.addWorksheet('Budgets');
      budgetSheet.columns = [
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Period', key: 'period', width: 14 },
      ];
      budgets.forEach(b => {
        budgetSheet.addRow({
          name: b.name,
          amount: Number(b.amount),
          category: b.category,
          period: b.period || 'monthly',
        });
      });

      // 6. Custom Categories Sheet
      const catSheet = workbook.addWorksheet('Categories');
      catSheet.columns = [
        { header: 'ID', key: 'id', width: 18 },
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Icon', key: 'icon', width: 16 },
        { header: 'Color', key: 'color', width: 16 },
        { header: 'Is Custom', key: 'isCustom', width: 12 },
      ];
      customCategories.forEach(c => {
        catSheet.addRow({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          isCustom: !c.isDefault ? 'Yes' : 'No',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-pilot-full-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Excel Workbook Exported",
        description: `Exported ${expenses.length} expenses, ${debts.length} dues, ${recurringExpenses.length + recurringDebts.length} recurring rules, ${budgets.length} budgets.`,
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel file.",
        variant: "destructive",
      });
    }
  };

  const importFromExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const expensesToImport: any[] = [];
      const debtsToImport: DebtRecord[] = [];
      const recurringExpensesToImport: RecurringExpense[] = [];
      const recurringDebtsToImport: RecurringDebt[] = [];
      const budgetsToImport: any[] = [];
      const categoriesToImport: any[] = [];

      const existingCategories = await db.categories.toArray();
      const activeCategories: any[] = [...existingCategories];

      const parseAmount = (val: string): number => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Math.abs(num);
      };

      // Helper to safely extract string values from ExcelJS cells
      const getVal = (cell: ExcelJS.Cell): string => {
        if (cell.value === null || cell.value === undefined) return '';
        if (typeof cell.value === 'object') {
          if ('text' in cell.value) return String(cell.value.text || '').trim();
          if ('result' in cell.value) return String(cell.value.result || '').trim();
          if (cell.value instanceof Date) {
            return format(cell.value, 'yyyy-MM-dd');
          }
        }
        return String(cell.value).trim();
      };

      // Helper to parse dates robustly
      const parseExcelDate = (val: string): string => {
        if (!val) return format(new Date(), 'yyyy-MM-dd');
        // If it's standard YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
          return val.substring(0, 10);
        }
        // If DD/MM/YYYY or DD-MM-YYYY
        const ddmmyyyy = val.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (ddmmyyyy) {
          const d = ddmmyyyy[1].padStart(2, '0');
          const m = ddmmyyyy[2].padStart(2, '0');
          const y = ddmmyyyy[3];
          return `${y}-${m}-${d}`;
        }
        // If numeric Excel timestamp
        const num = parseFloat(val);
        if (!isNaN(num) && num > 25000 && num < 60000) {
          const excelEpoch = new Date(Date.UTC(1899, 11, 30));
          const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
          return format(jsDate, 'yyyy-MM-dd');
        }
        // Try Date.parse fallback
        try {
          const d = new Date(val);
          if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
        } catch { }
        return format(new Date(), 'yyyy-MM-dd');
      };

      // Helper to build header map for a sheet
      const getHeaderMap = (sheet: ExcelJS.Worksheet): { map: Record<string, number>; startRow: number } => {
        const headerMap: Record<string, number> = {};
        let startRow = 1;
        sheet.eachRow((row, rowNumber) => {
          if (Object.keys(headerMap).length === 0) {
            row.eachCell((cell, colNumber) => {
              const h = getVal(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
              if (h) headerMap[h] = colNumber;
            });
            startRow = rowNumber;
          }
        });
        return { map: headerMap, startRow };
      };

      // 1. Process Categories Sheet FIRST so all custom categories exist in lookup
      const catSheet = workbook.getWorksheet('Categories') || workbook.getWorksheet('Custom Categories');
      if (catSheet) {
        const { map, startRow } = getHeaderMap(catSheet);
        catSheet.eachRow((row, rowNumber) => {
          if (rowNumber > startRow) {
            const getCol = (keys: string[]): string => {
              for (const k of keys) {
                if (map[k]) return getVal(row.getCell(map[k]));
              }
              return '';
            };

            const name = getCol(['name', 'categoryname', 'title']);
            if (name && !isGarbageCategory({ name })) {
              const id = getCol(['id', 'key']) || name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
              const icon = getCol(['icon']) || guessCategoryProperties(name).icon;
              const color = getCol(['color']) || guessCategoryProperties(name).color;

              const newCat = {
                id,
                userId: 'default',
                name,
                icon,
                color,
                isDefault: false,
                updatedAt: new Date(),
              };
              categoriesToImport.push(newCat);
              if (!activeCategories.some(c => c.id.toLowerCase() === id.toLowerCase())) {
                activeCategories.push(newCat);
              }
            }
          }
        });
      }

      // Helper to resolve category ID with auto-creation of missing custom categories
      const resolveAndRegisterCategory = (rawCatString: string): string => {
        if (!rawCatString) return 'groceries';
        const canonicalId = normalizeCategoryKey(activeCategories, rawCatString);

        // If canonicalId is not among known categories and is a clean custom name, auto-create it
        const exists = activeCategories.some(c => c.id.toLowerCase() === canonicalId.toLowerCase());
        if (!exists && rawCatString.trim().length > 1 && !isGarbageCategory({ name: rawCatString })) {
          const cleanName = rawCatString.trim();
          const cleanId = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          const guess = guessCategoryProperties(cleanName);
          const autoCat = {
            id: cleanId,
            userId: 'default',
            name: cleanName,
            icon: guess.icon,
            color: guess.color,
            isDefault: false,
            updatedAt: new Date(),
          };
          categoriesToImport.push(autoCat);
          activeCategories.push(autoCat);
          return cleanId;
        }

        return canonicalId;
      };

      // 2. Process Expenses Sheet (or first sheet)
      const expSheet = workbook.getWorksheet('Expenses') || (!workbook.getWorksheet('Recurring Expenses') ? workbook.worksheets[0] : null);
      if (expSheet) {
        const { map, startRow } = getHeaderMap(expSheet);
        expSheet.eachRow((row, rowNumber) => {
          if (rowNumber > startRow) {
            const getCol = (keys: string[]): string => {
              for (const k of keys) {
                if (map[k]) return getVal(row.getCell(map[k]));
              }
              return '';
            };

            const amt = parseAmount(getCol(['amount', 'spent', 'cost', 'price', 'total']));
            if (amt > 0) {
              const rawDate = getCol(['date', 'day', 'datetime', 'timestamp']);
              const rawTime = getCol(['time', 'hour']);
              const rawItem = getCol(['item', 'items', 'purpose', 'description', 'title', 'itempurpose']);
              const rawCat = getCol(['category', 'cat', 'categoryname']);
              const rawPay = getCol(['paymentmethod', 'payment', 'method', 'mode']);
              const rawAcc = getCol(['account', 'bank', 'acc']);
              const rawWhere = getCol(['where', 'location', 'place', 'merchant', 'store']);
              const rawNote = getCol(['note', 'notes', 'remark', 'remarks']);

              const canonicalCategory = resolveAndRegisterCategory(rawCat);

              expensesToImport.push({
                id: crypto.randomUUID(),
                amount: amt,
                date: parseExcelDate(rawDate),
                time: rawTime && /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : format(new Date(), 'HH:mm'),
                items: rawItem || 'Imported Expense',
                category: canonicalCategory,
                paymentMethod: rawPay || 'UPI',
                account: rawAcc || 'SBI',
                where: rawWhere || undefined,
                note: rawNote || undefined,
                isRecurring: false,
                isTemplate: false,
                attachments: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        });
      }

      // 3. Process Dues & Receivables Sheet
      const debtSheet = workbook.getWorksheet('Dues & Receivables') || workbook.getWorksheet('Dues') || workbook.getWorksheet('Debts');
      if (debtSheet) {
        const { map, startRow } = getHeaderMap(debtSheet);
        debtSheet.eachRow((row, rowNumber) => {
          if (rowNumber > startRow) {
            const getCol = (keys: string[]): string => {
              for (const k of keys) {
                if (map[k]) return getVal(row.getCell(map[k]));
              }
              return '';
            };

            const amt = parseAmount(getCol(['amount', 'total', 'due']));
            const person = getCol(['person', 'personname', 'name', 'who']);
            if (amt > 0 && person) {
              const rawType = getCol(['type', 'duetype']).toLowerCase();
              const isReceivable = rawType.includes('receivable') || rawType.includes('get') || rawType.includes('collect');
              const rawPurpose = getCol(['purpose', 'reason', 'item', 'notes']);
              const rawStatus = getCol(['status']).toLowerCase();
              const rawDate = getCol(['date', 'datetime', 'createdat']);
              const rawLoc = getCol(['location', 'where', 'place']);
              const rawNote = getCol(['notes', 'note', 'remarks']);

              debtsToImport.push({
                type: isReceivable ? 'receivable' : 'due',
                personName: person,
                amount: amt,
                purpose: rawPurpose || 'Imported Due',
                status: rawStatus.includes('settle') ? 'settled' : 'pending',
                location: rawLoc || undefined,
                notes: rawNote || undefined,
                datetime: parseExcelDate(rawDate) + 'T12:00',
                createdAt: new Date().toISOString(),
              });
            }
          }
        });
      }

      // 4. Process Recurring Expenses Sheet
      const recExpSheet = workbook.getWorksheet('Recurring Expenses') || workbook.getWorksheet('Recurring') || workbook.getWorksheet('Subscriptions');
      if (recExpSheet) {
        const { map, startRow } = getHeaderMap(recExpSheet);
        recExpSheet.eachRow((row, rowNumber) => {
          if (rowNumber > startRow) {
            const getCol = (keys: string[]): string => {
              for (const k of keys) {
                if (map[k]) return getVal(row.getCell(map[k]));
              }
              return '';
            };

            const amt = parseAmount(getCol(['amount', 'cost', 'price', 'total']));
            const item = getCol(['item', 'items', 'name', 'purpose', 'description', 'itempurpose']);
            if (amt > 0 && item) {
              const rawCat = getCol(['category', 'cat']);
              const rawFreq = getCol(['frequency', 'freq']).toLowerCase() as RecurrenceFrequency;
              const validFreq: RecurrenceFrequency = ['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(rawFreq) ? rawFreq : 'monthly';
              const rawInterval = parseInt(getCol(['intervalcount', 'interval', 'customintervalcount'])) || 1;
              const rawUnit = getCol(['intervalunit', 'unit', 'customintervalunit']).toLowerCase() as CustomIntervalUnit;
              const validUnit: CustomIntervalUnit = ['days', 'weeks', 'months', 'years'].includes(rawUnit) ? rawUnit : 'months';
              const rawPay = getCol(['paymentmethod', 'payment', 'method']);
              const rawAcc = getCol(['account', 'bank']);
              const rawStart = getCol(['startdate', 'start', 'date']);
              const rawEnd = getCol(['enddate', 'end']);
              const rawWhere = getCol(['where', 'location', 'place']);
              const rawNote = getCol(['note', 'notes', 'remarks']);
              const rawStatus = getCol(['status', 'active', 'state']).toLowerCase();
              const isActive = !rawStatus.includes('pause') && !rawStatus.includes('inactive') && !rawStatus.includes('no');

              const canonicalCategory = resolveAndRegisterCategory(rawCat);

              recurringExpensesToImport.push({
                id: crypto.randomUUID(),
                amount: amt,
                items: item,
                category: canonicalCategory,
                frequency: validFreq,
                customIntervalCount: rawInterval,
                customIntervalUnit: validUnit,
                paymentMethod: rawPay || 'UPI',
                account: rawAcc || 'SBI',
                startDate: parseExcelDate(rawStart),
                endDate: rawEnd ? parseExcelDate(rawEnd) : undefined,
                where: rawWhere || undefined,
                note: rawNote || undefined,
                isActive,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        });
      }

      // 5. Process Recurring Dues Sheet
      const recDebtSheet = workbook.getWorksheet('Recurring Dues') || workbook.getWorksheet('Recurring Debts');
      if (recDebtSheet) {
        const { map, startRow } = getHeaderMap(recDebtSheet);
        recDebtSheet.eachRow((row, rowNumber) => {
          if (rowNumber > startRow) {
            const getCol = (keys: string[]): string => {
              for (const k of keys) {
                if (map[k]) return getVal(row.getCell(map[k]));
              }
              return '';
            };

            const amt = parseAmount(getCol(['amount', 'total', 'due']));
            const person = getCol(['person', 'personname', 'name', 'who']);
            if (amt > 0 && person) {
              const rawType = getCol(['type', 'duetype']).toLowerCase();
              const isReceivable = rawType.includes('receivable') || rawType.includes('get');
              const rawPurpose = getCol(['purpose', 'reason', 'item', 'notes']);
              const rawFreq = getCol(['frequency', 'freq']).toLowerCase() as RecurrenceFrequency;
              const validFreq: RecurrenceFrequency = ['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(rawFreq) ? rawFreq : 'monthly';
              const rawInterval = parseInt(getCol(['intervalcount', 'interval'])) || 1;
              const rawUnit = getCol(['intervalunit', 'unit']).toLowerCase() as CustomIntervalUnit;
              const validUnit: CustomIntervalUnit = ['days', 'weeks', 'months', 'years'].includes(rawUnit) ? rawUnit : 'months';
              const rawStart = getCol(['startdate', 'start']);
              const rawEnd = getCol(['enddate', 'end']);
              const rawLoc = getCol(['location', 'where']);
              const rawNotes = getCol(['notes', 'note']);
              const rawStatus = getCol(['status', 'active']).toLowerCase();
              const isActive = !rawStatus.includes('pause') && !rawStatus.includes('inactive');

              recurringDebtsToImport.push({
                id: crypto.randomUUID(),
                type: isReceivable ? 'receivable' : 'due',
                personName: person,
                amount: amt,
                purpose: rawPurpose || 'Recurring Due',
                frequency: validFreq,
                customIntervalCount: rawInterval,
                customIntervalUnit: validUnit,
                startDate: parseExcelDate(rawStart),
                endDate: rawEnd ? parseExcelDate(rawEnd) : undefined,
                location: rawLoc || undefined,
                notes: rawNotes || undefined,
                isActive,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        });
      }

      // 6. Process Budgets Sheet
      const budgetSheet = workbook.getWorksheet('Budgets');
      if (budgetSheet) {
        const { map, startRow } = getHeaderMap(budgetSheet);
        budgetSheet.eachRow((row, rowNumber) => {
          if (rowNumber > startRow) {
            const getCol = (keys: string[]): string => {
              for (const k of keys) {
                if (map[k]) return getVal(row.getCell(map[k]));
              }
              return '';
            };

            const amt = parseAmount(getCol(['amount', 'limit', 'total']));
            const name = getCol(['name', 'title', 'budgetname']);
            if (amt > 0 && name) {
              const rawCat = getCol(['category', 'cat']);
              const period = getCol(['period', 'frequency']).toLowerCase();
              const canonicalCategory = (!rawCat || rawCat.toLowerCase() === 'overall')
                ? 'overall'
                : resolveAndRegisterCategory(rawCat);

              budgetsToImport.push({
                id: crypto.randomUUID(),
                userId: 'default',
                name,
                amount: amt,
                category: canonicalCategory,
                period: ['monthly', 'weekly', 'yearly'].includes(period) ? period : 'monthly',
                startDate: format(new Date(), 'yyyy-MM-01'),
                isActive: true,
                updatedAt: new Date(),
              });
            }
          }
        });
      }

      const totalItems = expensesToImport.length + debtsToImport.length + recurringExpensesToImport.length + recurringDebtsToImport.length + budgetsToImport.length + categoriesToImport.length;

      if (totalItems > 0) {
        await db.transaction('rw', [db.expenses, db.debts, db.recurringExpenses, db.recurringDebts, db.budgets, db.categories], async () => {
          if (categoriesToImport.length > 0) {
            for (const cat of categoriesToImport) {
              await db.categories.put(cat);
            }
          }
          if (expensesToImport.length > 0) await db.expenses.bulkAdd(expensesToImport);
          if (debtsToImport.length > 0) await db.debts.bulkAdd(debtsToImport);
          if (recurringExpensesToImport.length > 0) await db.recurringExpenses.bulkAdd(recurringExpensesToImport);
          if (recurringDebtsToImport.length > 0) await db.recurringDebts.bulkAdd(recurringDebtsToImport);
          if (budgetsToImport.length > 0) await db.budgets.bulkAdd(budgetsToImport);
        });

        // Run automated cleanup and recurring scheduler
        await cleanupAndDeduplicateCategories(db);
        await processRecurringRules();

        toast({
          title: "Import Completed Successfully",
          description: `Imported ${expensesToImport.length} expenses, ${debtsToImport.length} dues, ${recurringExpensesToImport.length + recurringDebtsToImport.length} recurring rules, ${budgetsToImport.length} budgets, ${categoriesToImport.length} categories.`,
        });
      } else {
        toast({
          title: "No Data Found",
          description: "Could not find any readable expense, due, recurring or budget records in the selected workbook.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Import Error",
        description: "Failed to parse and import the Excel spreadsheet. Please ensure the columns match the template.",
        variant: "destructive",
      });
    }

    // Reset input
    event.target.value = '';
  };

  const clearAllData = async () => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      if (confirm("This will permanently wipe all transactions, budgets, custom categories, recurring rules, and charts. Confirm to proceed?")) {
        try {
          await db.transaction('rw', [db.expenses, db.budgets, db.categories, db.debts, db.recurringExpenses, db.recurringDebts, db.customCharts, db.settings], async () => {
            await db.expenses.clear();
            await db.budgets.clear();
            await db.categories.clear();
            await db.debts.clear();
            await db.recurringExpenses.clear();
            await db.recurringDebts.clear();
            await db.customCharts.clear();
            await db.settings.clear();

            await db.categories.bulkAdd(DEFAULT_CATEGORIES);
            await db.settings.add({
              id: 'default',
              currency: '₹',
              theme: 'light',
              language: 'en',
              notifications: true,
              budgetAlerts: true,
              notifyBudgetAlerts: true,
              notifyRecurringReminders: true,
              notifyDueReminders: true,
            });
          });

          toast({
            title: "Database Reset",
            description: "All records cleared and defaults restored.",
          });
        } catch (error) {
          toast({
            title: "Reset Failed",
            description: "Failed to clear database.",
            variant: "destructive",
          });
        }
      }
    }
  };

  if (!settings) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="p-3.5 sm:p-5 max-w-2xl mx-auto space-y-4 pb-32">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Automations, appearance studio, notifications & backups</p>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: Manage Expenses, Categories & Automation (TOP OF SETTINGS)
          ========================================================================= */}
      <Card className="m3-card overflow-hidden border-border bg-card shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('automation')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors tap-spring"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground truncate">
                  Automation, Categories & Rules
                </CardTitle>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                  {recurringExpensesCount + recurringDebtsCount} Rules
                </span>
                <InfoButton
                  title="Automation & Categories"
                  description="Setup scheduled recurring subscriptions (Rent, Netflix, SIP) and dues. Customize your category catalog and icons."
                />
              </div>
              <CardDescription className="text-xs truncate mt-0.5">
                Manage auto-recurring expenses, debts, and custom categories
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.automation ? 'rotate-180 text-primary' : ''
            }`} />
        </button>

        {openSections.automation && (
          <CardContent className="p-4 pt-1 space-y-3 border-t border-border/60 animate-in slide-in-from-top-2 duration-200">
            {/* Manage Recurring Expenses */}
            <Button
              variant="outline"
              onClick={() => setIsRecurringExpensesOpen(true)}
              className="w-full justify-between font-normal h-auto py-3 px-3.5 text-left bg-card hover:bg-muted/60 border-border rounded-2xl"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="bg-primary/10 p-2 rounded-xl text-primary shrink-0">
                  <Repeat className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-foreground truncate">Manage Recurring Expenses</div>
                  <p className="text-[11px] text-muted-foreground truncate">Subscriptions, rent, bills & daily allowances</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {recurringExpensesCount > 0 && (
                  <span className="text-[11px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full">
                    {recurringExpensesCount} active
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Button>

            {/* Manage Recurring Dues */}
            <Button
              variant="outline"
              onClick={() => setIsRecurringDebtsOpen(true)}
              className="w-full justify-between font-normal h-auto py-3 px-3.5 text-left bg-card hover:bg-muted/60 border-border rounded-2xl"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-foreground truncate">Manage Recurring Dues & Debts</div>
                  <p className="text-[11px] text-muted-foreground truncate">EMI settlements, recurring loans & receivables</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {recurringDebtsCount > 0 && (
                  <span className="text-[11px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                    {recurringDebtsCount} active
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Button>

            {/* Manage Categories */}
            <ManageCategoriesDialog>
              <Button
                variant="outline"
                className="w-full justify-between font-normal h-auto py-3 px-3.5 text-left bg-card hover:bg-muted/60 border-border rounded-2xl"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Tags className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-foreground truncate">Manage Categories & Icons</div>
                    <p className="text-[11px] text-muted-foreground truncate">Custom 36+ icon library, color badges & cleanup</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>
            </ManageCategoriesDialog>

            {/* Manual Run Recurring Rules */}
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Automation Status: Active</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const res = await processRecurringRules();
                  toast({
                    title: "Rules Processed",
                    description: `Added ${res.expensesAdded} expenses & ${res.debtsAdded} dues.`,
                  });
                }}
                className="h-8 text-xs font-bold text-primary gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Process Rules Now</span>
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* =========================================================================
          SECTION 2: Appearance, Multi-Theme, Custom Colors & Gradient Studio
          ========================================================================= */}
      <Card className="m3-card overflow-hidden border-border bg-card shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('theme')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors tap-spring"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground truncate">
                  Theme, Colors & Typography Studio
                </CardTitle>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0 capitalize">
                  {THEME_OPTIONS.find(t => t.id === theme)?.name || theme}
                </span>
                <InfoButton
                  title="Theme & Appearance Studio"
                  description="Choose from 6 light presets, 5 dark/AMOLED themes, dual-color gradients, and 5 typography fonts with live instant preview."
                />
              </div>
              <CardDescription className="text-xs truncate mt-0.5">
                6 Light presets, 5 Dark/AMOLED modes, custom gradients & fonts
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.theme ? 'rotate-180 text-primary' : ''
            }`} />
        </button>

        {openSections.theme && (
          <CardContent className="p-4 pt-1 space-y-5 border-t border-border/60 animate-in slide-in-from-top-2 duration-200">

            {/* Theme Presets: Light vs Dark Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Theme Presets ({THEME_OPTIONS.length})
                </Label>

                {/* Mode Filter Tab */}
                <div className="flex bg-muted p-0.5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setThemeTab('light')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${themeTab === 'light' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                      }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light ({LIGHT_THEMES.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeTab('dark')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${themeTab === 'dark' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                      }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-primary" />
                    <span>Dark ({DARK_THEMES.length})</span>
                  </button>
                </div>
              </div>

              {/* Theme Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(themeTab === 'light' ? LIGHT_THEMES : DARK_THEMES).map((themeOpt) => {
                  const isSelected = theme === themeOpt.id;
                  return (
                    <button
                      key={themeOpt.id}
                      type="button"
                      onClick={() => setTheme(themeOpt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all relative tap-spring flex flex-col justify-between ${isSelected
                          ? 'border-primary ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 shadow-sm bg-primary/5'
                          : 'border-border hover:border-primary/40 bg-card'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full border border-border shadow-2xs"
                            style={{ backgroundColor: themeOpt.bgHex }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-md border border-border shadow-2xs -ml-1.5"
                            style={{ backgroundColor: themeOpt.cardHex }}
                          />
                        </div>
                        {themeOpt.tag && (
                          <span className="text-[9px] font-bold text-muted-foreground uppercase px-1.5 py-0.5 rounded-full bg-muted">
                            {themeOpt.tag}
                          </span>
                        )}
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          {themeOpt.name}
                        </span>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {themeOpt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Primary Accent Colors & Custom Color Dropper */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Primary Accent Palette
                </Label>
                <span className="text-[11px] text-primary font-extrabold capitalize">
                  {primaryColor === 'custom' ? `Custom Hex (${customHex})` : (PRIMARY_COLOR_OPTIONS.find(c => c.id === primaryColor)?.name || primaryColor)}
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRIMARY_COLOR_OPTIONS.map((colorOpt) => {
                  const isSelected = primaryColor === colorOpt.id;
                  return (
                    <button
                      key={colorOpt.id}
                      type="button"
                      onClick={() => setPrimaryColor(colorOpt.id)}
                      className={`p-2 rounded-2xl border text-center transition-all tap-spring flex flex-col items-center gap-1.5 ${isSelected
                          ? 'border-primary ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 bg-primary/5 shadow-xs'
                          : 'border-border hover:bg-muted/40'
                        }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-border shadow-xs flex items-center justify-center text-white"
                        style={{ backgroundColor: colorOpt.hex }}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="text-[10px] font-bold truncate max-w-full text-foreground">
                        {colorOpt.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Picker Tool */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-0 p-0 shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">Custom Color Picker</span>
                    <span className="text-[11px] text-muted-foreground font-mono uppercase">{customHex}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={customHex}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('#') && (val.length <= 7)) {
                        setCustomHex(val);
                      } else if (!val.startsWith('#') && val.length <= 6) {
                        setCustomHex(`#${val}`);
                      }
                    }}
                    className="w-24 h-8 text-xs uppercase font-mono font-bold"
                    placeholder="#8B5CF6"
                  />
                  <Button
                    size="sm"
                    variant={primaryColor === 'custom' ? 'default' : 'outline'}
                    className="h-8 text-xs font-bold rounded-xl"
                    onClick={() => setCustomHex(customHex)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Custom Dual-Color Gradient Palette Maker & Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dual-Color Gradient Themes
                </Label>
                <span className="text-[11px] text-primary font-extrabold">
                  {primaryColor === 'gradient' ? 'Active Gradient' : 'Select Gradient'}
                </span>
              </div>

              {/* Pre-built Gradient Theme Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GRADIENT_PRESETS.map((grad) => {
                  const isSelected = gradientPreset === grad.id && primaryColor === 'gradient';
                  return (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => setGradientPreset(grad.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all tap-spring flex items-center justify-between ${isSelected
                          ? 'border-primary ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 bg-primary/5 shadow-xs'
                          : 'border-border hover:bg-muted/40'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-xl shadow-xs shrink-0"
                          style={{ background: `linear-gradient(135deg, ${grad.fromHex}, ${grad.toHex})` }}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold truncate block text-foreground">
                            {grad.name}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Dual-Color Gradient Creator */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Custom Gradient Builder</span>
                  <div
                    className="w-16 h-5 rounded-full border border-border shadow-xs"
                    style={{ background: `linear-gradient(135deg, ${customGradient.from}, ${customGradient.to})` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border">
                    <input
                      type="color"
                      value={customGradient.from}
                      onChange={(e) => setCustomGradient({ ...customGradient, from: e.target.value })}
                      className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                    />
                    <div className="text-[10px]">
                      <span className="text-muted-foreground block">Color 1 (From)</span>
                      <span className="font-mono font-bold uppercase">{customGradient.from}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border">
                    <input
                      type="color"
                      value={customGradient.to}
                      onChange={(e) => setCustomGradient({ ...customGradient, to: e.target.value })}
                      className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                    />
                    <div className="text-[10px]">
                      <span className="text-muted-foreground block">Color 2 (To)</span>
                      <span className="font-mono font-bold uppercase">{customGradient.to}</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomGradient(customGradient)}
                  className="w-full text-xs font-bold rounded-xl text-primary"
                >
                  Apply Custom Gradient
                </Button>
              </div>
            </div>

            <Separator />

            {/* App Typography & Fonts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Typography & Font Style
                </Label>
                <span className="text-[11px] text-primary font-bold">
                  {FONT_OPTIONS.find(f => f.id === fontFamily)?.name || fontFamily}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONT_OPTIONS.map((fontOpt) => {
                  const isSelected = fontFamily === fontOpt.id;
                  return (
                    <button
                      key={fontOpt.id}
                      type="button"
                      onClick={() => setFontFamily(fontOpt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all tap-spring flex items-center justify-between ${isSelected
                          ? 'border-primary ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 bg-primary/5 shadow-xs'
                          : 'border-border hover:bg-muted/40'
                        }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-primary" />
                          <span className={`text-xs font-bold text-foreground ${fontOpt.fontClass}`}>
                            {fontOpt.name}
                          </span>
                        </div>
                        <p className={`text-[11px] text-muted-foreground ${fontOpt.fontClass}`}>
                          {fontOpt.label} · ₹12,450
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Font Size & Display Scale Customizer */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Font Size & Display Scale
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Adjust text sizing and UI density across the entire app
                  </p>
                </div>
                <span className="text-[10px] text-primary font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10">
                  {FONT_SIZE_OPTIONS.find(s => s.id === fontSize)?.name || fontSize} ({FONT_SIZE_OPTIONS.find(s => s.id === fontSize)?.percentage})
                </span>
              </div>

              {/* Segmented Font Size Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border">
                {FONT_SIZE_OPTIONS.map((sizeOpt) => {
                  const isSelected = fontSize === sizeOpt.id;
                  return (
                    <button
                      key={sizeOpt.id}
                      type="button"
                      onClick={() => setFontSize(sizeOpt.id)}
                      className={`py-2 px-2 rounded-xl text-center transition-all tap-spring flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-card text-primary font-black shadow-xs border border-border ring-1 ring-primary/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                      }`}
                    >
                      <span className="text-xs font-bold">{sizeOpt.name}</span>
                      <span className="text-[10px] text-muted-foreground opacity-80">{sizeOpt.percentage}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Live Typography Preview
                  </span>
                  <p className="font-bold text-sm text-foreground truncate mt-0.5">
                    Morning Coffee · {settings.currency || '₹'}120.00
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Food & Dining • Paid via UPI
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                    {FONT_SIZE_OPTIONS.find(s => s.id === fontSize)?.pxSize} Base
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* =========================================================================
          SECTION 3: Notifications & Smart Prompts
          ========================================================================= */}
      <Card className="m3-card overflow-hidden border-border bg-card shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('notifications')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors tap-spring"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground truncate">
                  Notifications & Smart Prompts
                </CardTitle>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${settings.notifications !== false ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
                  }`}>
                  {settings.notifications !== false ? 'Active' : 'Disabled'}
                </span>
                <InfoButton
                  title="Notifications & Smart Prompts"
                  description="Enable mobile/web push notifications, routine habit reminders, budget ceiling warnings, and quiet hours."
                />
              </div>
              <CardDescription className="text-xs truncate mt-0.5">
                AI habit detection, budget alerts & mobile push
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.notifications ? 'rotate-180 text-primary' : ''
            }`} />
        </button>

        {openSections.notifications && (
          <CardContent className="p-4 pt-1 space-y-4 border-t border-border/60 animate-in slide-in-from-top-2 duration-200">
            {/* Master Switch */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-foreground">Allow App Notifications</Label>
                <p className="text-xs text-muted-foreground">Master control for prompts and notifications</p>
              </div>
              <Switch
                checked={settings.notifications !== false}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ notifications: checked })}
              />
            </div>

            <Separator />

            {/* Device & Browser Push Permission Banner */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-foreground">Mobile & Web Push</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-amber-500/15 text-amber-600'
                    }`}>
                    {typeof window !== 'undefined' && 'Notification' in window
                      ? (Notification.permission === 'granted' ? 'Active' : 'Setup Required')
                      : 'Not Supported'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sends timely prompts directly on mobile lock screens.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const granted = await requestPermission();
                      if (granted) {
                        toast({ title: 'Notifications Activated', description: 'You will receive timely habit prompts.' });
                      }
                    }}
                    className="h-8 text-xs font-bold text-primary rounded-xl"
                  >
                    Enable Push
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sendTestNotification}
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  Test Alert
                </Button>
              </div>
            </div>

            {/* Smart Habit Prompts */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <Label className="text-sm font-bold text-foreground">
                    Smart Habit & Routine Detection
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Recommends logging recurring expenses at your customary days and hours.
                </p>
              </div>
              <Switch
                className="shrink-0 mt-0.5"
                checked={settings.notifyHabitPrompts !== false}
                disabled={settings.notifications === false}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ notifyHabitPrompts: checked })}
              />
            </div>

            {/* Budget Alerts */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <Label className="text-sm font-bold text-foreground">
                    Budget Threshold Alerts
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Triggers alert when category or monthly spending reaches your limit.
                </p>
              </div>
              <Switch
                className="shrink-0 mt-0.5"
                checked={settings.notifyBudgetAlerts !== false}
                disabled={settings.notifications === false}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ notifyBudgetAlerts: checked })}
              />
            </div>

            {/* Quiet Hours */}
            <div className="border-t border-border pt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Label className="text-sm font-bold text-foreground">
                      Quiet Hours Mode
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Silences mobile push notifications during night hours.
                  </p>
                </div>
                <Switch
                  className="shrink-0 mt-0.5"
                  checked={settings.quietHoursEnabled === true}
                  disabled={settings.notifications === false}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate({ quietHoursEnabled: checked })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* =========================================================================
          SECTION 4: Preferences & Currency
          ========================================================================= */}
      <Card className="m3-card overflow-hidden border-border bg-card shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('preferences')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors tap-spring"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground truncate">
                  Preferences & Currency
                </CardTitle>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                  {settings.currency || '₹'}
                </span>
                <InfoButton
                  title="Preferences & Currency"
                  description="Choose your preferred currency symbol. Changes are applied instantly throughout the app."
                />
              </div>
              <CardDescription className="text-xs truncate mt-0.5">
                Currency symbols, balances and default formatting
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.preferences ? 'rotate-180 text-primary' : ''
            }`} />
        </button>

        {openSections.preferences && (
          <CardContent className="p-4 pt-1 space-y-4 border-t border-border/60 animate-in slide-in-from-top-2 duration-200">
            {/* Active Currency Hero Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl shrink-0">{activeCurrencyInfo.flag}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-foreground">
                      {activeCurrencyInfo.name}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {activeCurrencyInfo.code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Symbol: <strong className="text-foreground font-bold">{settings.currency || '₹'}</strong> • {activeCurrencyInfo.country}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Preview
                </span>
                <span className="text-base font-black text-primary">
                  {settings.currency || '₹'}1,250.00
                </span>
              </div>
            </div>

            {/* Popular Quick-Select Currencies Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Popular Currencies</Label>
                <span className="text-[10px] text-muted-foreground">1-Tap Switch</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {POPULAR_CURRENCIES.map((curr) => {
                  const isSelected = settings.currency === curr.symbol || settings.currency === curr.code;
                  return (
                    <Button
                      key={curr.code}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 px-2.5 text-xs font-bold rounded-xl gap-1.5 tap-spring"
                      onClick={() => updateSettingsMutation.mutate({ currency: curr.symbol })}
                    >
                      <span>{curr.flag}</span>
                      <span>{curr.code} ({curr.symbol})</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Search All 160+ Currencies Button & Dialog */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Dialog open={isCurrencyDialogOpen} onOpenChange={setIsCurrencyDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10 px-3 text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Search All 160+ Global Currencies</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-5 rounded-3xl bg-card border-border">
                  <DialogHeader className="pb-2">
                    <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Globe className="w-5 h-5 text-primary" />
                      Global Currency Directory (160+)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Select your preferred currency symbol. Instantly applied to all reports, budgets, and dues.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Search Input Box */}
                  <div className="relative my-2">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={currencySearchQuery}
                      onChange={(e) => setCurrencySearchQuery(e.target.value)}
                      placeholder="Search currency, code, country, or symbol..."
                      className="h-9 pl-9 text-xs rounded-full bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    />
                    {currencySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCurrencySearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Currencies Scroll List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[50vh] no-scrollbar">
                    {filteredCurrencies.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                        <Coins className="w-8 h-8 mx-auto text-muted-foreground/50" />
                        <p className="font-bold text-foreground">No currency matched "{currencySearchQuery}"</p>
                        <p className="text-[11px]">You can enter a custom currency symbol below.</p>
                      </div>
                    ) : (
                      filteredCurrencies.map((curr) => {
                        const isSelected = settings.currency === curr.symbol || settings.currency === curr.code;
                        return (
                          <button
                            key={curr.code}
                            type="button"
                            onClick={() => {
                              updateSettingsMutation.mutate({ currency: curr.symbol });
                              setIsCurrencyDialogOpen(false);
                              toast({
                                title: `Currency Changed to ${curr.code} (${curr.symbol})`,
                                description: `Now displaying balances in ${curr.name}.`,
                              });
                            }}
                            className={`w-full p-2.5 rounded-2xl border text-left transition-all tap-spring flex items-center justify-between ${
                              isSelected
                                ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                                : 'bg-card border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-2xl shrink-0">{curr.flag}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-foreground truncate">
                                    {curr.name}
                                  </span>
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                    {curr.code}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {curr.country} • Sample: {curr.symbol}1,250
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-black text-sm text-primary">{curr.symbol}</span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Custom Currency Symbol Input */}
              <div className="flex items-center gap-1.5">
                <Input
                  value={customCurrencyInput}
                  onChange={(e) => setCustomCurrencyInput(e.target.value)}
                  placeholder="Custom symbol (e.g. ₿, NZ$, etc.)"
                  className="h-10 text-xs rounded-xl bg-card border-border text-foreground font-bold"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (customCurrencyInput.trim()) {
                      updateSettingsMutation.mutate({ currency: customCurrencyInput.trim() });
                      toast({
                        title: 'Custom Currency Applied',
                        description: `Using "${customCurrencyInput.trim()}" across the app.`,
                      });
                      setCustomCurrencyInput('');
                    }
                  }}
                  disabled={!customCurrencyInput.trim()}
                  className="h-10 px-3 text-xs font-bold rounded-xl text-primary shrink-0"
                >
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* =========================================================================
          SECTION 5: Data Management & Backup
          ========================================================================= */}
      <Card className="m3-card overflow-hidden border-border bg-card shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('backup')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors tap-spring"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground truncate">
                  Data Management & Backups
                </CardTitle>
                <InfoButton
                  title="Data Management & Backup"
                  description="Export and import complete JSON backups or multi-tab Excel spreadsheets. Your data stays 100% private and on-device."
                />
              </div>
              <CardDescription className="text-xs truncate mt-0.5">
                Full offline JSON backup and Excel spreadsheets
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.backup ? 'rotate-180 text-primary' : ''
            }`} />
        </button>

        {openSections.backup && (
          <CardContent className="p-4 pt-1 space-y-4 border-t border-border/60 animate-in slide-in-from-top-2 duration-200">
            {/* JSON Export/Import */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">JSON Full Backup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={exportData} variant="outline" className="w-full justify-start h-auto py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl">
                  <Download className="w-4 h-4 mr-2 shrink-0 text-primary" />
                  <span className="truncate">Export JSON Backup</span>
                </Button>

                <Label htmlFor="import-json-file" className="cursor-pointer">
                  <Button variant="outline" className="w-full justify-start h-auto py-2.5 px-3 text-xs sm:text-sm font-bold pointer-events-none rounded-xl" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2 shrink-0 text-blue-500" />
                      <span className="truncate">Import JSON File</span>
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
            </div>

            <Separator />

            {/* Excel Export & Import */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Excel Spreadsheet (.xlsx)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={exportToExcel} variant="outline" className="w-full justify-start h-auto py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl">
                  <FileSpreadsheet className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
                  <span className="truncate">Export to Excel</span>
                </Button>

                <Label htmlFor="import-excel-file" className="cursor-pointer">
                  <Button variant="outline" className="w-full justify-start h-auto py-2.5 px-3 text-xs sm:text-sm font-bold pointer-events-none rounded-xl" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
                      <span className="truncate">Import from Excel</span>
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
              <p className="text-[11px] text-muted-foreground">
                Import expenses and dues spreadsheets. Automatically maps dates, amounts, categories, and payment modes.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* =========================================================================
          SECTION 6: App Shortcuts & Mobile Glass Widgets
          ========================================================================= */}
      <Card className="m3-card overflow-hidden border-border bg-card shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('shortcuts')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors tap-spring"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground truncate">
                  App Shortcuts & Mobile Widgets
                </CardTitle>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 shrink-0">
                  5 Shortcuts Active
                </span>
              </div>
              <CardDescription className="text-xs truncate mt-0.5">
                Long-press icon options, quick launchers and widget shortcuts
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.shortcuts ? 'rotate-180 text-primary' : ''}`} />
        </button>

        {openSections.shortcuts && (
          <CardContent className="p-4 pt-1 space-y-3 border-t border-border/60 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-muted-foreground">
              When you long press the Pocket Ledger icon on your mobile device home screen, these instant actions are available:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: 'Add Expense', desc: 'Instantly opens new expense entry modal', icon: Plus, link: '/?action=add-expense', color: 'text-rose-500 bg-rose-500/10' },
                { name: 'Dues & Receivables', desc: 'Directly manage pending balances', icon: ArrowRightLeft, link: '/?tab=dues', color: 'text-emerald-500 bg-emerald-500/10' },
                { name: 'Spending Charts', desc: 'View monthly breakdown & analytics', icon: FileSpreadsheet, link: '/?tab=charts', color: 'text-blue-500 bg-blue-500/10' },
                { name: 'Budget Limits', desc: 'Check threshold caps & category limits', icon: Wallet, link: '/?tab=budget', color: 'text-purple-500 bg-purple-500/10' },
                { name: 'Glass Widgets Studio', desc: 'Open 10+ mobile glass widgets & speed loggers', icon: Sparkles, link: '/?tab=widgets', color: 'text-amber-500 bg-amber-500/10' },
              ].map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <div key={shortcut.name} className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between gap-2.5 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${shortcut.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {shortcut.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {shortcut.desc}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = shortcut.link}
                      className="h-7 px-2 text-[10px] font-bold rounded-lg shrink-0 text-primary"
                    >
                      Launch
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* =========================================================================
          SECTION 7: Danger Zone / Reset
          ========================================================================= */}
      <Card className="m3-card overflow-hidden border-rose-500/30 bg-card shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('danger')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-rose-500/5 transition-colors tap-spring"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400 truncate">
                  App Reset & Danger Zone
                </CardTitle>
                <InfoButton
                  title="App Reset"
                  description="Permanently wipes all transactions, categories, budgets, and resets settings to default."
                />
              </div>
              <CardDescription className="text-xs truncate mt-0.5">
                Permanently erase local records and reset default settings
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.danger ? 'rotate-180 text-rose-500' : ''
            }`} />
        </button>

        {openSections.danger && (
          <CardContent className="p-4 pt-1 space-y-3 border-t border-rose-500/20 animate-in slide-in-from-top-2 duration-200">
            <Button
              onClick={clearAllData}
              variant="destructive"
              className="w-full justify-center h-auto py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl shadow-xs"
            >
              <Trash2 className="w-4 h-4 mr-2 shrink-0" />
              <span>Clear All Data & Reset App</span>
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Irreversibly deletes all expenses, dues, custom charts, recurring rules, and resets settings.
            </p>
          </CardContent>
        )}
      </Card>

      {/* App Info Footer */}
      <div className="flex flex-col items-center justify-center pt-2 gap-1 text-xs text-muted-foreground">
        <span>Pocket Ledger(Beta) · PWA Offline First</span>
        <div className="px-3 py-1 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground flex items-center space-x-1">
          <span>Made with</span>
          <span className="text-rose-500">❤️</span>
          <span>by Jack</span>
        </div>
      </div>

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
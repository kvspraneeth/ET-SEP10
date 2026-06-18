import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, Trash2, Pencil, Check, X, ChevronRight, Tags, FileSpreadsheet } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import db from '@/lib/db';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { useLiveQuery } from 'dexie-react-hooks';
import { getIconComponent } from '@/components/category-selector';
import { getCategoryColor } from '@/lib/categories';
import ExcelJS from 'exceljs';

// A sub-component to handle the Manage Categories Dialog cleanly
function ManageCategoriesDialog({ children }: { children: React.ReactNode }) {
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
      if (!open) setEditingId(null); // Reset editing state when closed
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      {/* The Dialog overlays on top of the page and natively includes a Close (X) button */}
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 mt-4 pb-4">
          {categories.map((category) => {
            const colors = getCategoryColor(category.color);
            const isEditing = editingId === category.id;

            return (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-800">
                
                {/* Left Side: Name or Edit Input */}
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
                
                {/* Right Side: Action Buttons */}
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
      
      const data = {
        expenses,
        budgets,
        categories,
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
        description: "Data exported successfully!",
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

      const workbook = new ExcelJS.Workbook();

      // Expenses sheet
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
      ];
      expenses.forEach(exp => expensesSheet.addRow(exp));

      // Budgets sheet
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
      budgets.forEach(b => budgetsSheet.addRow(b));

      // Categories sheet
      const categoriesSheet = workbook.addWorksheet('Categories');
      categoriesSheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Icon', key: 'icon', width: 10 },
        { header: 'Color', key: 'color', width: 15 },
        { header: 'Is Default', key: 'isDefault', width: 10 },
      ];
      categories.forEach(c => categoriesSheet.addRow(c));

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
        description: "Excel file exported successfully!",
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
        
        if (confirm('This will replace all your current data. Are you sure?')) {
          await db.expenses.clear();
          await db.budgets.clear();
          await db.categories.clear();
          
          if (data.expenses) await db.expenses.bulkAdd(data.expenses);
          if (data.budgets) await db.budgets.bulkAdd(data.budgets);
          if (data.categories) await db.categories.bulkAdd(data.categories);
          if (data.settings) await updateSettingsMutation.mutateAsync(data.settings);
          
          toast({
            title: "Success",
            description: "Data imported successfully!",
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

        if (confirm('This will replace all your current data. Are you sure?')) {
          await db.expenses.clear();
          await db.budgets.clear();
          await db.categories.clear();

          // Expenses
          const expensesSheet = workbook.getWorksheet('Expenses');
          if (expensesSheet) {
            const expenses: any[] = [];
            expensesSheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return; // skip header
              const [
                Date, Time, Amount, Category, Items, Location,
                PaymentMethod, Account, Notes, CreatedAt
              ] = row.values as any[];

              expenses.push({
                id: crypto.randomUUID(),
                date: Date || new Date().toISOString().split('T')[0],
                time: Time || '00:00',
                amount: parseFloat(Amount) || 0,
                category: Category || 'other',
                items: Items || '',
                where: Location || '',
                paymentMethod: PaymentMethod || 'UPI',
                account: Account || 'Other',
                note: Notes || '',
                isRecurring: false,
                isTemplate: false,
                attachments: [],
                createdAt: CreatedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            });
            await db.expenses.bulkAdd(expenses);
          }

          // Budgets
          const budgetsSheet = workbook.getWorksheet('Budgets');
          if (budgetsSheet) {
            const budgets: any[] = [];
            budgetsSheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;
              const [Name, Amount, Category, Period, StartDate, IsActive, CreatedAt] = row.values as any[];
              budgets.push({
                id: crypto.randomUUID(),
                name: Name || 'Budget',
                amount: parseFloat(Amount) || 0,
                category: Category || 'other',
                period: Period || 'monthly',
                startDate: StartDate || new Date().toISOString().split('T')[0],
                isActive: IsActive === 'Yes' || IsActive === true,
                createdAt: CreatedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            });
            await db.budgets.bulkAdd(budgets);
          }

          // Categories
          const categoriesSheet = workbook.getWorksheet('Categories');
          if (categoriesSheet) {
            const categories: any[] = [];
            categoriesSheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;
              const [Name, Icon, Color, IsDefault] = row.values as any[];
              categories.push({
                id: crypto.randomUUID(),
                name: Name || 'Category',
                icon: Icon || '📝',
                color: Color || 'gray',
                isDefault: IsDefault === 'Yes' || IsDefault === true,
              });
            });
            await db.categories.bulkAdd(categories);
          }

          toast({
            title: "Success",
            description: "Excel data imported successfully!",
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to import Excel file. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const clearAllData = async () => {
    if (confirm('This will permanently delete all your expenses, budgets, and settings. This action cannot be undone. Are you sure?')) {
      try {
        await db.expenses.clear();
        await db.budgets.clear();
        await db.categories.clear();
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

      {/* Preferences */}
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
          
          <div className="border-t dark:border-gray-800 pt-4">
            <ManageCategoriesDialog>
              <Button 
                variant="outline" 
                className="w-full justify-between font-normal h-12 text-base hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                    <Tags className="w-4 h-4" />
                  </div>
                  <span>Manage Categories</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </ManageCategoriesDialog>
          </div>

        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* JSON Export/Import */}
          <div>
            <h4 className="font-medium mb-2">JSON Format</h4>
            <div className="space-y-2">
              <Button onClick={exportData} variant="outline" className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export as JSON
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              JSON format preserves all data including settings
            </p>
          </div>

          <Separator />

          {/* Excel Export/Import */}
          <div>
            <h4 className="font-medium mb-2">Excel Format</h4>
            <div className="space-y-2">
              <Button onClick={exportToExcel} variant="outline" className="w-full justify-start">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Excel format with separate sheets for expenses, budgets, and categories
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Permanently delete all expenses, budgets, and reset settings
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
              <span>2.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Build</span>
              <span>PWA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Storage</span>
              <span>IndexedDB (Offline)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
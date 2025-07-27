import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Download, Upload, Trash2, Moon, Sun } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import db from '@/lib/db';

export function Settings() {
  const settings = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { theme, toggleTheme } = useTheme();
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

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (confirm('This will replace all your current data. Are you sure?')) {
          // Clear existing data
          await db.expenses.clear();
          await db.budgets.clear();
          await db.categories.clear();
          
          // Import new data
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
    
    // Reset input
    event.target.value = '';
  };

  const clearAllData = async () => {
    if (confirm('This will permanently delete all your expenses, budgets, and settings. This action cannot be undone. Are you sure?')) {
      try {
        await db.expenses.clear();
        await db.budgets.clear();
        await db.categories.clear();
        
        // Reset settings to defaults
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
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Customize your app preferences and manage data
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <SettingsIcon className="w-4 h-4 mr-2" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Theme</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose between light and dark mode
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="flex items-center space-x-2"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="capitalize">{theme}</span>
            </Button>
          </div>

          <Separator />

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Currency</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Default currency for expenses
              </p>
            </div>
            <Select
              value={settings.currency}
              onValueChange={(value) => handleSettingChange('currency', value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="₹">₹ INR</SelectItem>
                <SelectItem value="$">$ USD</SelectItem>
                <SelectItem value="€">€ EUR</SelectItem>
                <SelectItem value="£">£ GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Notifications</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable app notifications
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
            />
          </div>

          <Separator />

          {/* Budget Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Budget Alerts</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get notified when approaching budget limits
              </p>
            </div>
            <Switch
              checked={settings.budgetAlerts}
              onCheckedChange={(checked) => handleSettingChange('budgetAlerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div>
            <Button onClick={exportData} variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Download all your expenses and settings as a JSON file
            </p>
          </div>

          {/* Import Data */}
          <div>
            <Label htmlFor="import-file">
              <Button variant="outline" className="w-full justify-start" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </span>
              </Button>
            </Label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Restore data from a previously exported JSON file
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

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Version</span>
              <span>1.0.0</span>
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

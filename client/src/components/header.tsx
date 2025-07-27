import { Bell, Moon, Sun, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from './theme-provider';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="gradient-header text-white p-4 sticky top-0 z-40 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ExpenseTracker</h1>
            <p className="text-sm opacity-90">Your Finance Manager</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-10 h-10 bg-white bg-opacity-20 rounded-lg hover:bg-white hover:bg-opacity-30 transition-all text-white hover:text-white"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 bg-white bg-opacity-20 rounded-lg hover:bg-white hover:bg-opacity-30 transition-all text-white hover:text-white relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              2
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}

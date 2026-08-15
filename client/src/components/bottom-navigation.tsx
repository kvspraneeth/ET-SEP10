import { Home, List, PieChart, Wallet, Settings, ArrowRightLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddClick?: () => void;
}

export function BottomNavigation({ activeTab, onTabChange, onAddClick }: BottomNavigationProps) {
  const leftTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'expenses', label: 'Expenses', icon: List },
    { id: 'debts', label: 'Dues', icon: ArrowRightLeft },
  ];

  const rightTabs = [
    { id: 'charts', label: 'Charts', icon: PieChart },
    { id: 'budget', label: 'Budget', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mobile-safe-area z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-screen-md mx-auto flex items-center justify-between px-2 py-1 relative">
        {/* Left Tabs */}
        <div className="flex flex-1 justify-around items-center">
          {leftTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex flex-col items-center py-1 px-1.5 transition-all min-w-[52px] rounded-lg",
                activeTab === id
                  ? "text-primary font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Center Prominent Add Button */}
        <div className="flex items-center justify-center px-1.5 -mt-5">
          <button
            type="button"
            onClick={onAddClick}
            aria-label="Add new expense"
            className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ring-4 ring-white dark:ring-gray-900 focus:outline-none"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Right Tabs */}
        <div className="flex flex-1 justify-around items-center">
          {rightTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex flex-col items-center py-1 px-1.5 transition-all min-w-[52px] rounded-lg",
                activeTab === id
                  ? "text-primary font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
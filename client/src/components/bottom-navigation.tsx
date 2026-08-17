import {
  Home, ReceiptText, ArrowLeftRight, BarChart3, Wallet2,
  SlidersHorizontal, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddClick?: () => void;
}

export function BottomNavigation({ activeTab, onTabChange, onAddClick }: BottomNavigationProps) {
  const leftTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'debts', label: 'Dues', icon: ArrowLeftRight },
    { id: 'budget', label: 'Budget', icon: Wallet2 },
  ];

  const rightTabs = [
    { id: 'expenses', label: 'Expenses', icon: ReceiptText },
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
      <nav className="bottom-nav-capsule pointer-events-auto w-full max-w-md rounded-full border border-border/80 shadow-[0_10px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.65)] px-2 py-1.5 transition-all">
        <div className="grid grid-cols-7 items-center justify-items-center relative">

          {/* Left Tabs */}
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-1.5 rounded-full transition-all duration-200 tap-spring relative group",
                  isActive
                    ? "text-primary font-black scale-105"
                    : "text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100"
                )}
                title={tab.label}
              >
                <div className={cn(
                  "p-1.5 rounded-full transition-all flex items-center justify-center",
                  isActive && "bg-primary/15 text-primary shadow-xs"
                )}>
                  <Icon className={cn(
                    "w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform",
                    isActive ? "stroke-[2.6] scale-110" : "stroke-[1.9] group-hover:scale-105"
                  )} />
                </div>
                <span className="text-[9px] sm:text-[10px] tracking-tight font-bold mt-0.5 truncate leading-none">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary shadow-xs shadow-primary" />
                )}
              </button>
            );
          })}

          {/* Center Raised Add Action Button */}
          <div className="flex items-center justify-center -my-3">
            <button
              type="button"
              onClick={onAddClick}
              aria-label="Add new transaction"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 ring-4 ring-card focus:outline-none"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
            </button>
          </div>

          {/* Right Tabs */}
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-1.5 rounded-full transition-all duration-200 tap-spring relative group",
                  isActive
                    ? "text-primary font-black scale-105"
                    : "text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100"
                )}
                title={tab.label}
              >
                <div className={cn(
                  "p-1.5 rounded-full transition-all flex items-center justify-center",
                  isActive && "bg-primary/15 text-primary shadow-xs"
                )}>
                  <Icon className={cn(
                    "w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform",
                    isActive ? "stroke-[2.6] scale-110" : "stroke-[1.9] group-hover:scale-105"
                  )} />
                </div>
                <span className="text-[9px] sm:text-[10px] tracking-tight font-bold mt-0.5 truncate leading-none">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary shadow-xs shadow-primary" />
                )}
              </button>
            );
          })}

        </div>
      </nav>
    </div>
  );
}
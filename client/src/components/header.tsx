import { Bell, Moon, Sun, Wallet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from './theme-provider';
import { useNotifications } from '@/hooks/use-notifications';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenWidgets?: () => void;
}

export function Header({ onOpenNotifications, onOpenWidgets }: HeaderProps) {
  const { theme, toggleTheme, isDarkTheme } = useTheme();
  const { unreadCount } = useNotifications();

  return (
    <header className="app-header text-foreground p-3.5 sm:p-4 sticky top-0 z-40 shadow-xs backdrop-blur-2xl border-b border-border transition-colors duration-200">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 bg-primary/15 text-primary rounded-2xl flex items-center justify-center shadow-inner shrink-0 ring-1 ring-primary/25 overflow-hidden">
            <img 
              src="/icons/v3_maskable_512.png" 
              alt="Pocket Ledger" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to Wallet icon if image not available
                e.currentTarget.style.display = 'none';
              }}
            />
            <Wallet className="w-5 h-5 stroke-[2.3] hidden only:block" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate text-foreground">
                Pocket Ledger
              </h1>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 tracking-wider shrink-0">
                Beta(v3)
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate font-semibold">Smart Finance & Habits</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onOpenWidgets && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenWidgets}
              aria-label="Open mobile glass widgets"
              title="Mobile Glass Widgets Studio"
              className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 hover:bg-primary/20 active:scale-95 rounded-full transition-all text-primary border border-primary/25 shadow-xs tap-spring"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 sm:w-10 sm:h-10 bg-muted/70 hover:bg-muted active:scale-95 rounded-full transition-all text-foreground hover:text-primary border border-border shadow-xs tap-spring"
          >
            {isDarkTheme ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500/20" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary/20" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenNotifications}
            aria-label="Open notifications"
            className="w-9 h-9 sm:w-10 sm:h-10 bg-muted/70 hover:bg-muted active:scale-95 rounded-full transition-all text-foreground hover:text-primary border border-border shadow-xs relative tap-spring"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <>
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-md ring-2 ring-background animate-in zoom-in-50 duration-200">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-400 rounded-full animate-ping opacity-75 pointer-events-none" />
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

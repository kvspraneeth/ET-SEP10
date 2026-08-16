import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { ExpenseForm } from "@/components/expense-form";
import { NotificationCenter } from "@/components/notification-center";
import { Home } from "@/pages/home";
import { Expenses } from "@/pages/expenses";
import { Charts } from "@/pages/charts";
import { Budget } from "@/pages/budget";
import { Settings } from "@/pages/settings";
import DuesReceivables from "./pages/duesreceivables"; 
import { Expense } from "@shared/schema";
import { processRecurringRules } from "./lib/recurring-engine";
import { cleanupAndDeduplicateCategories } from "./lib/categories";
import { runAllNotificationChecks } from "./lib/notifications";
import db from "./lib/db";

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Automatically clean up categories, process recurring rules, and run smart notification checks
  useEffect(() => {
    cleanupAndDeduplicateCategories(db).then(() => {
      processRecurringRules().then(({ expensesAdded, debtsAdded }) => {
        if (expensesAdded > 0 || debtsAdded > 0) {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
        // Run initial notification and habit routine check
        runAllNotificationChecks();
      });
    });

    // Periodic check for habit prompts, budget alerts & recurring reminders (every 4 minutes)
    const notifInterval = setInterval(() => {
      runAllNotificationChecks();
    }, 4 * 60 * 1000);

    return () => clearInterval(notifInterval);
  }, []);

  const handleOpenExpenseForm = (payload?: string | any) => {
    if (payload && typeof payload === 'object') {
      if (payload.id) {
        // Editing an existing expense
        setEditingExpense(JSON.parse(JSON.stringify(payload)));
        setSelectedCategory(payload.category);
      } else {
        // Pre-filling from Habit Notification / Frequent Transaction / Template / Reuse (new expense)
        setEditingExpense(JSON.parse(JSON.stringify(payload)));
        setSelectedCategory(payload.category || undefined);
      }
    } else if (typeof payload === 'string' && payload.trim() !== '') {
      // Opening with a specific category from Quick Add
      setSelectedCategory(payload);
      setEditingExpense(null);
    } else {
      // Opening a blank new expense form
      setSelectedCategory(undefined);
      setEditingExpense(null);
    }
    setIsExpenseFormOpen(true);
  };

  const handleCloseExpenseForm = (open: boolean) => {
    setIsExpenseFormOpen(open);
    if (!open) {
      setTimeout(() => {
        setEditingExpense(null);
        setSelectedCategory(undefined);
      }, 150); 
    }
  };

  const handleNotificationAction = (actionType: string, payload?: any) => {
    if (actionType === 'add_expense') {
      handleOpenExpenseForm(payload);
    } else if (actionType === 'view_budget') {
      setActiveTab('budget');
    } else if (actionType === 'view_dues') {
      setActiveTab('debts');
    } else if (actionType === 'view_charts') {
      setActiveTab('charts');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
            <Header onOpenNotifications={() => setIsNotificationCenterOpen(true)} />
            
            {/* Zero-Lag Tab Switching: Tabs stay rendered in DOM, eliminating mount/unmount lag */}
            <main className="pb-28 md:pb-16 w-full max-w-screen-2xl mx-auto">
              <div className={activeTab === 'home' ? 'block' : 'hidden'}>
                <Home onTabChange={setActiveTab} onOpenExpenseForm={handleOpenExpenseForm} />
              </div>
              <div className={activeTab === 'expenses' ? 'block' : 'hidden'}>
                <Expenses onOpenExpenseForm={handleOpenExpenseForm} />
              </div>
              <div className={activeTab === 'debts' ? 'block' : 'hidden'}>
                <DuesReceivables />
              </div>
              <div className={activeTab === 'charts' ? 'block' : 'hidden'}>
                <Charts />
              </div>
              <div className={activeTab === 'budget' ? 'block' : 'hidden'}>
                <Budget />
              </div>
              <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
                <Settings />
              </div>
            </main>
            
            <BottomNavigation 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              onAddClick={() => handleOpenExpenseForm()} 
            />
       
            <ExpenseForm
              open={isExpenseFormOpen} 
              onOpenChange={handleCloseExpenseForm}
              preSelectedCategory={selectedCategory}
              editingExpense={editingExpense}
            />

            <NotificationCenter
              open={isNotificationCenterOpen}
              onOpenChange={setIsNotificationCenterOpen}
              onActionClick={handleNotificationAction}
            />
          
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
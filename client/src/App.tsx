import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { ExpenseForm } from "@/components/expense-form";
import { Home } from "@/pages/home";
import { Expenses } from "@/pages/expenses";
import { Charts } from "@/pages/charts";
import { Budget } from "@/pages/budget";
import { Settings } from "@/pages/settings";
import DuesReceivables from "./pages/duesreceivables"; 
import { Expense } from "@shared/schema";

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleOpenExpenseForm = (payload?: string | any) => {
    if (payload && typeof payload === 'object' && payload.id) {
      // Editing an existing expense
      setEditingExpense(JSON.parse(JSON.stringify(payload)));
      setSelectedCategory(payload.category);
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
      }, 200); 
    }
  };

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home onTabChange={setActiveTab} onOpenExpenseForm={handleOpenExpenseForm} />;
      case 'expenses':
        return <Expenses onOpenExpenseForm={handleOpenExpenseForm} />;
      case 'debts':
        return <DuesReceivables />;
      case 'charts':
        return <Charts />;
      case 'budget':
        return <Budget />;
      case 'settings':
        return <Settings />;
      default:
        return <Home onTabChange={setActiveTab} onOpenExpenseForm={handleOpenExpenseForm} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header />
            
            <main className="pb-28 md:pb-12 w-full max-w-screen-2xl mx-auto">
              {renderCurrentPage()}
            </main>
            
            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
       
            <ExpenseForm
              open={isExpenseFormOpen} 
              onOpenChange={handleCloseExpenseForm}
              preSelectedCategory={selectedCategory}
              editingExpense={editingExpense}
            />
          
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
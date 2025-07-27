import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { FloatingActionButton } from "@/components/floating-action-button";
import { ExpenseForm } from "@/components/expense-form";
import { Home } from "@/pages/home";
import { Expenses } from "@/pages/expenses";
import { Charts } from "@/pages/charts";
import { Budget } from "@/pages/budget";
import { Settings } from "@/pages/settings";

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home onTabChange={setActiveTab} onOpenExpenseForm={() => setIsExpenseFormOpen(true)} />;
      case 'expenses':
        return <Expenses onOpenExpenseForm={() => setIsExpenseFormOpen(true)} />;
      case 'charts':
        return <Charts />;
      case 'budget':
        return <Budget />;
      case 'settings':
        return <Settings />;
      default:
        return <Home onTabChange={setActiveTab} onOpenExpenseForm={() => setIsExpenseFormOpen(true)} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header />
            
            <main className="pb-20 mobile-safe-area">
              {renderCurrentPage()}
            </main>

            <FloatingActionButton onClick={() => setIsExpenseFormOpen(true)} />
            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            
            <ExpenseForm open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen} />
          </div>
          
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import { StatsOverview } from '@/components/stats-overview';
import { CategorySelector } from '@/components/category-selector';
import { RecentExpenses } from '@/components/recent-expenses';
import { BudgetOverview } from '@/components/budget-overview';

interface HomeProps {
  onTabChange: (tab: string) => void;
  onOpenExpenseForm: (category: string) => void;
}

export function Home({ onTabChange, onOpenExpenseForm }: HomeProps) {
  return (
    <div className="p-4 space-y-6">
      <StatsOverview />
      
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Quick Add</h2>
        </div>
        
        <CategorySelector 
          onCategorySelect={(category) => onOpenExpenseForm(category)} 
          variant="pill"
          limit={4} 
        />
      </div>

      <BudgetOverview />
      
      <RecentExpenses onViewAll={() => onTabChange('expenses')} />
    </div>
  );
}
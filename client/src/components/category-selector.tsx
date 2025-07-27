import { Button } from '@/components/ui/button';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor } from '@/lib/categories';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  selectedCategory?: string;
  onCategorySelect: (categoryId: string) => void;
  variant?: 'pill' | 'button';
  limit?: number;
}

export function CategorySelector({ 
  selectedCategory, 
  onCategorySelect, 
  variant = 'button',
  limit 
}: CategorySelectorProps) {
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const displayCategories = limit ? categories.slice(0, limit) : categories;

  if (variant === 'pill') {
    return (
      <div className="grid grid-cols-4 gap-3">
        {displayCategories.map((category) => {
          const colors = getCategoryColor(category.color);
          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={cn(
                "category-pill p-3 rounded-xl text-center text-xs font-medium transition-all hover:scale-105 min-h-[80px] flex flex-col items-center justify-center",
                colors.bg,
                colors.text
              )}
            >
              <div className="text-lg mb-1">{category.icon}</div>
              <div className="leading-tight text-center break-words max-w-full">{category.name}</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {displayCategories.map((category) => (
        <Button
          key={category.id}
          type="button"
          variant="outline"
          onClick={() => onCategorySelect(category.id)}
          className={cn(
            "p-3 h-auto flex-col text-xs border-2 hover:border-primary focus:border-primary",
            selectedCategory === category.id
              ? "border-primary bg-primary/10"
              : "border-gray-200 dark:border-gray-600"
          )}
        >
          <div className="text-lg mb-1">{category.icon}</div>
          <div>{category.name}</div>
        </Button>
      ))}
    </div>
  );
}

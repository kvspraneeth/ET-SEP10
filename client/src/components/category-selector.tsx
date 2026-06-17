import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor, guessCategoryProperties } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { ShoppingCart, Utensils, Car, FileText, Tv, Heart, ShoppingBag, Plane, TrendingUp, Plus, Tag, LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CategorySelectorProps {
  selectedCategory?: string;
  onCategorySelect: (categoryId: string) => void;
  variant?: 'pill' | 'dropdown';
  limit?: number;
}

export const iconMap: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'car': Car,
  'file-text': FileText,
  'tv': Tv,
  'heart': Heart,
  'shopping-bag': ShoppingBag,
  'plane': Plane,
  'trending-up': TrendingUp,
  'tag': Tag,
};

export function getIconComponent(iconName: string, className?: string) {
  const IconComponent = iconMap[iconName] || Tag;
  const classes = className || "w-5 h-5";
  return <IconComponent className={classes} />;
}

// Reusable Add Category Component
export function AddCategoryDialog({ 
  open, 
  onOpenChange, 
  onAdded 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  onAdded?: (id: string) => void 
}) {
  const [name, setName] = useState('');
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      const id = crypto.randomUUID();
      const { icon, color } = guessCategoryProperties(name); // Auto-assign icon & color
      
      await db.categories.add({
        id,
        userId: 'local',
        name: name.trim(),
        icon,
        color,
        isDefault: false,
        updatedAt: new Date(),
      });
      
      onOpenChange(false);
      setName('');
      if (onAdded) onAdded(id);
      
      toast({ title: 'Category created' });
    } catch (e) {
      toast({ title: 'Failed to add category', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="category-name">Category Name</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Subscriptions, Pet Care"
            className="mt-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CategorySelector({ 
  selectedCategory, 
  onCategorySelect, 
  variant = 'dropdown',
  limit 
}: CategorySelectorProps) {
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Home Page Quick Access Variant
  if (variant === 'pill') {
    // Show top X categories, minus 1 to leave room for the "Add Expense" pill
    const displayCategories = limit ? categories.slice(0, limit - 1) : categories;

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
              <div className="text-lg mb-1">{getIconComponent(category.icon, "w-5 h-5")}</div>
              <div className="leading-tight text-center break-words max-w-full">{category.name}</div>
            </button>
          );
        })}
        
        {/* Add Expense Pill (Replaces the Floating Action Button) */}
        <button
          onClick={() => onCategorySelect('')} // Empty string routes to a blank Add Expense form
          className="p-3 rounded-xl text-center text-xs font-medium transition-all hover:scale-105 min-h-[80px] flex flex-col items-center justify-center border-2 border-dashed border-primary/50 text-primary hover:border-primary hover:bg-primary/5 dark:border-primary/40 dark:text-primary dark:hover:bg-primary/10"
        >
          <div className="text-lg mb-1"><Plus className="w-6 h-6" /></div>
          <div className="leading-tight text-center break-words max-w-full">Expense</div>
        </button>
      </div>
    );
  }

  // Dropdown Variant (Used in Add Expense Form)
  return (
    <>
      <Select 
        value={selectedCategory} 
        onValueChange={(val) => {
          if (val === 'NEW') {
            setIsAddOpen(true);
          } else {
            onCategorySelect(val);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectItem value="NEW" className="font-semibold text-primary focus:bg-primary/10 cursor-pointer">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> 
              <span>Create New...</span>
            </div>
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id} className="cursor-pointer">
              <div className="flex items-center gap-2">
                <span className={getCategoryColor(category.color).text}>
                  {getIconComponent(category.icon, "w-4 h-4")}
                </span>
                <span>{category.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <AddCategoryDialog open={isAddOpen} onOpenChange={setIsAddOpen} onAdded={onCategorySelect} />
    </>
  );
}
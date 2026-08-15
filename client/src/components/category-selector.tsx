import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor, guessCategoryProperties, findCategory, DEFAULT_CATEGORIES, isGarbageCategory } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { 
  ShoppingCart, Utensils, Car, FileText, Tv, Heart, ShoppingBag, 
  Plane, TrendingUp, Plus, Tag, LucideIcon, Search, Check, ChevronDown, Sparkles 
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@shared/schema';

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

export const getIconComponent = (iconName: string, className?: string) => {
  const IconComponent = iconMap[iconName] || Tag;
  return <IconComponent className={className || "w-4 h-4"} />;
};

// Reusable Add Category Component
export function AddCategoryDialog({ 
  open, 
  onOpenChange, 
  onAdded 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onAdded?: (id: string) => void; 
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
      
      toast({ title: 'Category created successfully' });
    } catch (e) {
      toast({ title: 'Failed to add category', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>Create New Category</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-3 space-y-3">
          <Label htmlFor="new-category-name">Category Name</Label>
          <Input
            id="new-category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Subscriptions, Gym, Coffee, Books"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Icon and accent color will be automatically assigned based on the name.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>Create Category</Button>
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
  const rawCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sanitize and deduplicate categories cleanly
  const categories = useMemo(() => {
    const valid = (rawCategories || []).filter(c => !isGarbageCategory(c));
    const seen = new Set<string>();
    const deduped: Category[] = [];
    
    for (const cat of valid) {
      const key = cat.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(cat);
      }
    }
    
    // Ensure standard defaults always exist
    for (const def of DEFAULT_CATEGORIES) {
      const key = def.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(def);
      }
    }
    return deduped;
  }, [rawCategories]);

  const selectedCategoryObj = useMemo(() => {
    return findCategory(categories, selectedCategory);
  }, [categories, selectedCategory]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  // Home Page Quick Access Variant
  if (variant === 'pill') {
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
                "category-pill p-3 rounded-xl text-center text-xs font-medium transition-all hover:scale-105 min-h-[80px] flex flex-col items-center justify-center shadow-sm",
                colors.bg,
                colors.text
              )}
            >
              <div className="text-lg mb-1">{getIconComponent(category.icon, "w-5 h-5")}</div>
              <div className="leading-tight text-center break-words max-w-full font-semibold">{category.name}</div>
            </button>
          );
        })}
        
        {/* Add Expense Pill */}
        <button
          onClick={() => onCategorySelect('')}
          className="p-3 rounded-xl text-center text-xs font-medium transition-all hover:scale-105 min-h-[80px] flex flex-col items-center justify-center border-2 border-dashed border-primary/50 text-primary hover:border-primary hover:bg-primary/5 dark:border-primary/40 dark:text-primary dark:hover:bg-primary/10 shadow-sm"
        >
          <div className="text-lg mb-1"><Plus className="w-6 h-6" /></div>
          <div className="leading-tight text-center break-words max-w-full font-semibold">Expense</div>
        </button>
      </div>
    );
  }

  // Smooth Category Selector (Trigger + Searchable Modal Picker)
  const selectedColors = selectedCategoryObj ? getCategoryColor(selectedCategoryObj.color) : null;

  return (
    <>
      {/* Category Picker Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setSearchQuery('');
          setIsPickerOpen(true);
        }}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left",
          "bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700",
          !selectedCategoryObj && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {selectedCategoryObj ? (
            <>
              <span className={cn("p-1.5 rounded-md shrink-0 flex items-center justify-center", selectedColors?.bg, selectedColors?.text)}>
                {getIconComponent(selectedCategoryObj.icon, "w-4 h-4")}
              </span>
              <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
                {selectedCategoryObj.name}
              </span>
            </>
          ) : (
            <>
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>Select category</span>
            </>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {/* Smooth Category Selection Dialog */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-4 z-[65]">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">Select Category</DialogTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsPickerOpen(false);
                  setIsAddOpen(true);
                }}
                className="gap-1.5 text-xs h-8 text-primary border-primary/30 hover:bg-primary/5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Search Box */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category..."
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>

          {/* Scrollable Category List with custom smooth scrolling */}
          <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1 space-y-1.5">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
                <p>No category matching "{searchQuery}"</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsPickerOpen(false);
                    setIsAddOpen(true);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create "{searchQuery}"</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredCategories.map((cat) => {
                  const colors = getCategoryColor(cat.color);
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onCategorySelect(cat.id);
                        setIsPickerOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-sm transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-sm font-semibold"
                          : "border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/60"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-md shrink-0 flex items-center justify-center", colors.bg, colors.text)}>
                        {getIconComponent(cat.icon, "w-4 h-4")}
                      </div>
                      <span className="truncate flex-1 font-medium">{cat.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPickerOpen(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <AddCategoryDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onAdded={(id) => {
          onCategorySelect(id);
          setIsPickerOpen(false);
        }} 
      />
    </>
  );
}
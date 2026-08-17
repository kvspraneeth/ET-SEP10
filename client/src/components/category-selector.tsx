import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor, guessCategoryProperties, findCategory, DEFAULT_CATEGORIES, isGarbageCategory } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { 
  ShoppingCart, Utensils, Car, FileText, Tv, Heart, ShoppingBag, 
  Plane, TrendingUp, Plus, Tag, LucideIcon, Search, Check, ChevronDown, Sparkles,
  Coffee, Pizza, Beer, Cake, Gift, Shirt, Bus, Bike, Fuel, Wallet, CreditCard,
  Coins, Landmark, PiggyBank, Wifi, Zap, Smartphone, Laptop, Dumbbell,
  Stethoscope, Smile, Gamepad, Film, Music, Book, Briefcase, Shield, Baby, Home
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
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
  'coffee': Coffee,
  'pizza': Pizza,
  'beer': Beer,
  'cake': Cake,
  'gift': Gift,
  'shirt': Shirt,
  'bus': Bus,
  'bike': Bike,
  'fuel': Fuel,
  'wallet': Wallet,
  'credit-card': CreditCard,
  'coins': Coins,
  'landmark': Landmark,
  'piggy-bank': PiggyBank,
  'wifi': Wifi,
  'zap': Zap,
  'smartphone': Smartphone,
  'laptop': Laptop,
  'dumbbell': Dumbbell,
  'stethoscope': Stethoscope,
  'smile': Smile,
  'gamepad': Gamepad,
  'film': Film,
  'music': Music,
  'book': Book,
  'briefcase': Briefcase,
  'home': Home,
  'baby': Baby,
  'shield': Shield,
  'sparkles': Sparkles,
};

export const AVAILABLE_CATEGORY_ICONS = [
  { id: 'shopping-cart', name: 'Groceries / Cart', icon: ShoppingCart },
  { id: 'utensils', name: 'Food & Dining', icon: Utensils },
  { id: 'coffee', name: 'Coffee & Cafe', icon: Coffee },
  { id: 'pizza', name: 'Fast Food', icon: Pizza },
  { id: 'car', name: 'Car & Auto', icon: Car },
  { id: 'fuel', name: 'Fuel & Petrol', icon: Fuel },
  { id: 'bus', name: 'Transit & Bus', icon: Bus },
  { id: 'bike', name: 'Bike / Scooter', icon: Bike },
  { id: 'plane', name: 'Travel & Flight', icon: Plane },
  { id: 'shopping-bag', name: 'Shopping', icon: ShoppingBag },
  { id: 'shirt', name: 'Clothing & Apparel', icon: Shirt },
  { id: 'gift', name: 'Gifts & Rewards', icon: Gift },
  { id: 'file-text', name: 'Bills & Invoices', icon: FileText },
  { id: 'zap', name: 'Electricity & Utilities', icon: Zap },
  { id: 'wifi', name: 'Internet & WiFi', icon: Wifi },
  { id: 'smartphone', name: 'Mobile Recharge', icon: Smartphone },
  { id: 'laptop', name: 'Electronics / Tech', icon: Laptop },
  { id: 'tv', name: 'Entertainment & OTT', icon: Tv },
  { id: 'film', name: 'Cinema & Movies', icon: Film },
  { id: 'music', name: 'Music & Audio', icon: Music },
  { id: 'gamepad', name: 'Gaming & Apps', icon: Gamepad },
  { id: 'heart', name: 'Healthcare & Medical', icon: Heart },
  { id: 'stethoscope', name: 'Doctor & Pharmacy', icon: Stethoscope },
  { id: 'dumbbell', name: 'Gym & Fitness', icon: Dumbbell },
  { id: 'trending-up', name: 'Investing & Stocks', icon: TrendingUp },
  { id: 'wallet', name: 'Salary & Income', icon: Wallet },
  { id: 'credit-card', name: 'Cards & EMI', icon: CreditCard },
  { id: 'coins', name: 'Savings & Cash', icon: Coins },
  { id: 'landmark', name: 'Bank & Taxes', icon: Landmark },
  { id: 'piggy-bank', name: 'Piggy Bank', icon: PiggyBank },
  { id: 'home', name: 'Rent & Housing', icon: Home },
  { id: 'book', name: 'Education & Books', icon: Book },
  { id: 'briefcase', name: 'Business & Office', icon: Briefcase },
  { id: 'baby', name: 'Kids & Family', icon: Baby },
  { id: 'shield', name: 'Insurance & Safety', icon: Shield },
  { id: 'sparkles', name: 'Special / Luxury', icon: Sparkles },
  { id: 'tag', name: 'General Tag', icon: Tag },
];

export const AVAILABLE_CATEGORY_COLORS = [
  { id: 'purple', name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-300', dot: 'bg-purple-500' },
  { id: 'green', name: 'Emerald', bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-600 dark:text-green-300', dot: 'bg-green-500' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-300', dot: 'bg-blue-500' },
  { id: 'orange', name: 'Amber', bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-300', dot: 'bg-orange-500' },
  { id: 'red', name: 'Rose', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-300', dot: 'bg-red-500' },
  { id: 'cyan', name: 'Teal', bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-600 dark:text-cyan-300', dot: 'bg-cyan-500' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-600 dark:text-pink-300', dot: 'bg-pink-500' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-600 dark:text-indigo-300', dot: 'bg-indigo-500' },
  { id: 'gray', name: 'Slate', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', dot: 'bg-gray-500' },
];

export const getIconComponent = (iconName: string, className?: string) => {
  const IconComponent = iconMap[iconName] || Tag;
  return <IconComponent className={className || "w-4 h-4"} />;
};

// Reusable Add / Edit Category Dialog with Icon & Color Pickers
export function AddCategoryDialog({ 
  open, 
  onOpenChange, 
  onAdded,
  initialCategory,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onAdded?: (id: string) => void; 
  initialCategory?: Category | null;
}) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('tag');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (initialCategory) {
        setName(initialCategory.name);
        setSelectedIcon(initialCategory.icon || 'tag');
        setSelectedColor(initialCategory.color || 'purple');
      } else {
        setName('');
        setSelectedIcon('tag');
        setSelectedColor('purple');
      }
    }
  }, [open, initialCategory]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialCategory && val.trim().length > 2) {
      const guessed = guessCategoryProperties(val);
      setSelectedIcon(guessed.icon);
      setSelectedColor(guessed.color);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (initialCategory) {
        // Edit existing
        await db.categories.update(initialCategory.id, {
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
          updatedAt: new Date(),
        });
        toast({ title: 'Category updated successfully' });
        if (onAdded) onAdded(initialCategory.id);
      } else {
        // Create new
        const id = crypto.randomUUID();
        await db.categories.add({
          id,
          userId: 'local',
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
          isDefault: false,
          updatedAt: new Date(),
        });
        toast({ title: 'Category created successfully' });
        if (onAdded) onAdded(id);
      }
      
      onOpenChange(false);
      setName('');
    } catch (e) {
      toast({ title: 'Failed to save category', variant: 'destructive' });
    }
  };

  const currentColorObj = getCategoryColor(selectedColor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden z-[75]">
        <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-800 pr-11 sm:pr-4">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{initialCategory ? 'Edit Category' : 'Create New Category'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Live Badge Preview */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Badge Preview</span>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-xs shadow-sm ${currentColorObj.bg} ${currentColorObj.text}`}>
              {getIconComponent(selectedIcon, "w-4 h-4")}
              <span>{name.trim() || 'New Category'}</span>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="category-name-input" className="text-xs font-semibold">Category Name</Label>
            <Input
              id="category-name-input"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Subscriptions, Gym, Coffee, Books"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Accent Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVAILABLE_CATEGORY_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedColor(col.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${col.dot} ${
                    selectedColor === col.id ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={col.name}
                >
                  {selectedColor === col.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Choose Icon ({AVAILABLE_CATEGORY_ICONS.length})</Label>
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {isIconPickerOpen ? 'Show less' : 'View full grid'}
              </button>
            </div>

            <div className={`grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 rounded-xl bg-muted/50 border border-border ${
              isIconPickerOpen ? 'max-h-52 overflow-y-auto' : 'max-h-24 overflow-hidden'
            }`}>
              {AVAILABLE_CATEGORY_ICONS.map(({ id, icon: IconComponent, name: iconLabel }) => {
                const isSelected = selectedIcon === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedIcon(id)}
                    title={iconLabel}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-md scale-105'
                        : 'bg-card hover:bg-muted text-foreground border border-border/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 bg-muted/40 border-t border-border gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            {initialCategory ? 'Save Changes' : 'Create Category'}
          </Button>
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

  // Selected Category Object
  const currentCategory = useMemo(() => {
    return findCategory(categories, selectedCategory);
  }, [categories, selectedCategory]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const displayedCategories = limit ? categories.slice(0, limit) : categories;

  if (variant === 'pill') {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {displayedCategories.map((category) => {
            const colors = getCategoryColor(category.color);
            const isSelected = selectedCategory === category.id || selectedCategory === category.name;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategorySelect(category.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all tap-spring',
                  colors.bg,
                  colors.text,
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-sm'
                    : 'opacity-85 hover:opacity-100 hover:scale-102'
                )}
              >
                {getIconComponent(category.icon, "w-3.5 h-3.5")}
                <span>{category.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all tap-spring"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>More</span>
          </button>
        </div>

        {/* Full Category Picker Dialog */}
        <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden z-[65]">
            <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-800 pr-11 sm:pr-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold">Select Category</DialogTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddOpen(true)}
                  className="gap-1 text-xs text-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="pl-10 h-9 text-xs rounded-full bg-background/60"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 pill-scroller">
              {filteredCategories.map((category) => {
                const colors = getCategoryColor(category.color);
                const isSelected = selectedCategory === category.id || selectedCategory === category.name;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      onCategorySelect(category.id);
                      setIsPickerOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all tap-spring',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                        : 'border-border hover:bg-muted/60'
                    )}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${colors.bg} ${colors.text}`}>
                      {getIconComponent(category.icon, "w-4 h-4")}
                    </div>
                    <span className="font-semibold text-xs truncate flex-1 text-foreground">
                      {category.name}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

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

  // Dropdown / Trigger button variant
  const currentColors = getCategoryColor(currentCategory.color);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        className="w-full flex items-center justify-between p-2.5 rounded-full border border-border bg-card hover:bg-muted/70 transition-all tap-spring shadow-xs px-3.5"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-full shrink-0 ${currentColors.bg} ${currentColors.text}`}>
            {getIconComponent(currentCategory.icon, "w-4 h-4")}
          </div>
          <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
            {currentCategory.name}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {/* Full Category Picker Dialog */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden z-[65] rounded-3xl">
          <DialogHeader className="p-4 border-b border-border pr-11 sm:pr-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">Select Category</DialogTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsAddOpen(true)}
                className="gap-1 text-xs text-primary rounded-full font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="pl-10 h-9 text-xs rounded-full bg-card border-border text-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 pill-scroller">
            {filteredCategories.map((category) => {
              const colors = getCategoryColor(category.color);
              const isSelected = selectedCategory === category.id || selectedCategory === category.name;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onCategorySelect(category.id);
                    setIsPickerOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all tap-spring',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-border hover:bg-muted/60'
                  )}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${colors.bg} ${colors.text}`}>
                    {getIconComponent(category.icon, "w-4 h-4")}
                  </div>
                  <span className="font-semibold text-xs truncate flex-1 text-foreground">
                    {category.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
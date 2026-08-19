import { createContext, useContext, useEffect, useState } from 'react';
import db from '@/lib/db';

export type Theme = 
  | 'light' | 'latte' | 'sky' | 'mint' | 'blush' | 'cream'
  | 'dark' | 'amoled' | 'midnight' | 'sunset' | 'forest';

export type PrimaryColor = 'violet' | 'emerald' | 'blue' | 'amber' | 'rose' | 'teal' | 'indigo' | 'gold' | 'custom' | 'gradient';
export type FontFamily = 'jakarta' | 'outfit' | 'inter' | 'manrope' | 'sora';
export type FontSize = 'compact' | 'standard' | 'medium' | 'large' | 'xlarge';

export interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  bgHex: string;
  cardHex: string;
  isDark: boolean;
  tag?: string;
}

export interface ColorOption {
  id: PrimaryColor;
  name: string;
  hex: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  fromHex: string;
  toHex: string;
  gradientClass: string;
  description: string;
}

export interface CustomGradient {
  from: string;
  to: string;
  angle?: number;
}

export interface FontOption {
  id: FontFamily;
  name: string;
  label: string;
  fontClass: string;
}

export interface FontSizeOption {
  id: FontSize;
  name: string;
  label: string;
  percentage: string;
  pxSize: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: 'compact', name: 'Compact', label: 'Dense & Compact', percentage: '88%', pxSize: '14px' },
  { id: 'standard', name: 'Standard', label: 'Balanced Default', percentage: '100%', pxSize: '16px' },
  { id: 'medium', name: 'Medium', label: 'Comfortable', percentage: '108%', pxSize: '17.5px' },
  { id: 'large', name: 'Large', label: 'High Readability', percentage: '118%', pxSize: '19px' },
  { id: 'xlarge', name: 'Extra Large', label: 'Maximum Size', percentage: '128%', pxSize: '21px' },
];

export const LIGHT_THEMES: ThemeOption[] = [
  { id: 'light', name: 'Clean Milk', description: 'Pure, bright & high readability', bgHex: '#fcfcfc', cardHex: '#ffffff', isDark: false, tag: 'Standard' },
  { id: 'latte', name: 'Warm Latte', description: 'Cozy sand & soft espresso hues', bgHex: '#fbf8f3', cardHex: '#ffffff', isDark: false, tag: 'Warm' },
  { id: 'sky', name: 'Nordic Sky', description: 'Crisp powder blue & arctic air', bgHex: '#f0f6fc', cardHex: '#ffffff', isDark: false, tag: 'Cool' },
  { id: 'mint', name: 'Pastel Mint', description: 'Refreshing sage & soft spring green', bgHex: '#f0f8f4', cardHex: '#ffffff', isDark: false, tag: 'Fresh' },
  { id: 'blush', name: 'Rose Quartz', description: 'Gentle blush & warm rose petal', bgHex: '#fcf0f3', cardHex: '#ffffff', isDark: false, tag: 'Soft' },
  { id: 'cream', name: 'Paper Cream', description: 'Classic editorial linen & ivory', bgHex: '#f7f5f0', cardHex: '#fefdfb', isDark: false, tag: 'Classic' },
];

export const DARK_THEMES: ThemeOption[] = [
  { id: 'dark', name: 'Charcoal Dark', description: 'Modern deep slate & reduced glare', bgHex: '#0f0f12', cardHex: '#18181b', isDark: true, tag: 'Balanced' },
  { id: 'amoled', name: 'Pitch AMOLED', description: 'True pitch black #000000 for OLED battery saving', bgHex: '#000000', cardHex: '#000000', isDark: true, tag: 'OLED 0%' },
  { id: 'midnight', name: 'Cosmic Midnight', description: 'Deep oceanic navy blue night', bgHex: '#080d19', cardHex: '#0e1626', isDark: true, tag: 'Navy' },
  { id: 'sunset', name: 'Warm Sunset', description: 'Rich espresso & dark ember warmth', bgHex: '#140c08', cardHex: '#1c130d', isDark: true, tag: 'Ember' },
  { id: 'forest', name: 'Emerald Forest', description: 'Calming dark pine & jade hues', bgHex: '#08120d', cardHex: '#0d1c14', isDark: true, tag: 'Pine' },
];

export const THEME_OPTIONS: ThemeOption[] = [...LIGHT_THEMES, ...DARK_THEMES];

export const PRIMARY_COLOR_OPTIONS: ColorOption[] = [
  { id: 'violet', name: 'Violet Eclipse', hex: '#8b5cf6' },
  { id: 'emerald', name: 'Electric Emerald', hex: '#10b981' },
  { id: 'blue', name: 'Sapphire Blue', hex: '#3b82f6' },
  { id: 'amber', name: 'Sunset Amber', hex: '#f59e0b' },
  { id: 'rose', name: 'Rose Crimson', hex: '#f43f5e' },
  { id: 'teal', name: 'Cyan Neon', hex: '#14b8a6' },
  { id: 'indigo', name: 'Royal Indigo', hex: '#6366f1' },
  { id: 'gold', name: 'Luxe Gold', hex: '#eab308' },
];

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'cyberpunk', name: 'Cyberpunk Neon', fromHex: '#d946ef', toHex: '#06b6d4', gradientClass: 'from-fuchsia-500 to-cyan-500', description: 'Electric neon fuchsia to cyan' },
  { id: 'sunset-glow', name: 'Sunset Amber', fromHex: '#f97316', toHex: '#f43f5e', gradientClass: 'from-orange-500 to-rose-500', description: 'Tangerine sunset to warm rose' },
  { id: 'aurora', name: 'Aurora Emerald', fromHex: '#10b981', toHex: '#06b6d4', gradientClass: 'from-emerald-500 to-teal-400', description: 'Deep jade to arctic cyan' },
  { id: 'mystic-indigo', name: 'Cosmic Violet', fromHex: '#8b5cf6', toHex: '#6366f1', gradientClass: 'from-violet-500 to-indigo-500', description: 'Royal purple to deep indigo' },
  { id: 'ocean-depths', name: 'Ocean Sapphire', fromHex: '#3b82f6', toHex: '#0284c7', gradientClass: 'from-blue-500 to-sky-600', description: 'Electric sapphire to deep ocean' },
  { id: 'golden-luxe', name: 'Luxe Gold & Amber', fromHex: '#f59e0b', toHex: '#e11d48', gradientClass: 'from-amber-400 to-rose-600', description: 'Rich gold to ruby ember' },
];

export const FONT_OPTIONS: FontOption[] = [
  { id: 'jakarta', name: 'Plus Jakarta Sans', label: 'Fintech & Modern Geometric', fontClass: 'font-jakarta' },
  { id: 'outfit', name: 'Outfit', label: 'Friendly, Rounded & Tech', fontClass: 'font-outfit' },
  { id: 'inter', name: 'Inter', label: 'Ultra-Clean & Standard', fontClass: 'font-inter' },
  { id: 'manrope', name: 'Manrope', label: 'Bold, Editorial & Sharp', fontClass: 'font-manrope' },
  { id: 'sora', name: 'Sora', label: 'Futuristic & Distinctive', fontClass: 'font-sora' },
];

export function hexToHsl(hex: string): { h: number; s: number; l: number; hslStr: string } {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c || '8b5cf6', 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  return {
    h: hDeg,
    s: sPct,
    l: lPct,
    hslStr: `${hDeg} ${sPct}% ${lPct}%`,
  };
}

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  customHex: string;
  setCustomHex: (hex: string) => void;
  customGradient: CustomGradient;
  setCustomGradient: (grad: CustomGradient) => void;
  gradientPreset: string;
  setGradientPreset: (presetId: string) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  toggleTheme: () => void;
  isDarkTheme: boolean;
};

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
  primaryColor: 'violet',
  setPrimaryColor: () => null,
  customHex: '#8b5cf6',
  setCustomHex: () => null,
  customGradient: { from: '#8b5cf6', to: '#3b82f6', angle: 135 },
  setCustomGradient: () => null,
  gradientPreset: 'mystic-indigo',
  setGradientPreset: () => null,
  fontFamily: 'jakarta',
  setFontFamily: () => null,
  fontSize: 'standard',
  setFontSize: () => null,
  toggleTheme: () => null,
  isDarkTheme: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme;
      if (saved && THEME_OPTIONS.some(t => t.id === saved)) {
        return saved;
      }
    }
    return defaultTheme;
  });

  const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primary_color') as PrimaryColor;
      if (saved && ['violet', 'emerald', 'blue', 'amber', 'rose', 'teal', 'indigo', 'gold', 'custom', 'gradient'].includes(saved)) {
        return saved;
      }
    }
    return 'violet';
  });

  const [customHex, setCustomHexState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custom_hex_color');
      if (saved && /^#[0-9A-Fa-f]{6}$/.test(saved)) {
        return saved;
      }
    }
    return '#8b5cf6';
  });

  const [customGradient, setCustomGradientState] = useState<CustomGradient>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('custom_gradient');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { from: '#8b5cf6', to: '#3b82f6', angle: 135 };
  });

  const [gradientPreset, setGradientPresetState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gradient_preset');
      if (saved) return saved;
    }
    return 'mystic-indigo';
  });

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('font_family') as FontFamily;
      if (saved && ['jakarta', 'outfit', 'inter', 'manrope', 'sora'].includes(saved)) {
        return saved;
      }
    }
    return 'jakarta';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('font_size') as FontSize;
      if (saved && ['compact', 'standard', 'medium', 'large', 'xlarge'].includes(saved)) {
        return saved;
      }
    }
    return 'standard';
  });

  // Load from IndexedDB on startup
  useEffect(() => {
    db.settings.toCollection().first().then((settings) => {
      if (settings) {
        if (settings.theme && THEME_OPTIONS.some(t => t.id === settings.theme)) {
          setThemeState(settings.theme as Theme);
        }
        if (settings.primaryColor) {
          if (settings.primaryColor.startsWith('#')) {
            setPrimaryColorState('custom');
            setCustomHexState(settings.primaryColor);
          } else if (['violet', 'emerald', 'blue', 'amber', 'rose', 'teal', 'indigo', 'gold', 'custom', 'gradient'].includes(settings.primaryColor)) {
            setPrimaryColorState(settings.primaryColor as PrimaryColor);
          }
        }
        if (settings.fontFamily && ['jakarta', 'outfit', 'inter', 'manrope', 'sora'].includes(settings.fontFamily)) {
          setFontFamilyState(settings.fontFamily as FontFamily);
        }
        if (settings.fontSize && ['compact', 'standard', 'medium', 'large', 'xlarge'].includes(settings.fontSize)) {
          setFontSizeState(settings.fontSize as FontSize);
        }
      }
    }).catch(err => console.warn('Could not load theme from DB:', err));
  }, []);

  // Apply theme classes, primary color, gradients, and dynamic HSL variables to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all theme classes
    root.classList.remove(
      'light', 'latte', 'sky', 'mint', 'blush', 'cream',
      'dark', 'amoled', 'midnight', 'sunset', 'forest'
    );
    
    // Add current theme class
    root.classList.add(theme);
    
    const isDark = DARK_THEMES.some(t => t.id === theme);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Handle Primary Color / Custom Palette / Gradient
    root.setAttribute('data-primary', primaryColor);
    
    let activeHex = '#8b5cf6';
    if (primaryColor === 'custom') {
      activeHex = customHex || '#8b5cf6';
    } else if (primaryColor === 'gradient') {
      activeHex = customGradient.from || '#8b5cf6';
    } else {
      const preset = PRIMARY_COLOR_OPTIONS.find(c => c.id === primaryColor);
      if (preset) {
        activeHex = preset.hex;
      }
    }

    const { hslStr, l } = hexToHsl(activeHex);
    root.style.setProperty('--primary', hslStr);
    root.style.setProperty('--ring', hslStr);
    root.style.setProperty('--primary-foreground', l > 65 ? '220 40% 10%' : '0 0% 100%');
    
    // Inject Custom Gradient variables
    const gradFrom = primaryColor === 'gradient' ? (customGradient.from || activeHex) : activeHex;
    const gradTo = primaryColor === 'gradient' ? (customGradient.to || activeHex) : activeHex;
    const gradAngle = customGradient.angle || 135;
    root.style.setProperty('--gradient-from', gradFrom);
    root.style.setProperty('--gradient-to', gradTo);
    root.style.setProperty('--gradient-custom', `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})`);
    
    // Remove all font classes and apply the active one on both html and body
    const fontClasses = ['font-jakarta', 'font-outfit', 'font-inter', 'font-manrope', 'font-sora'];
    fontClasses.forEach(cls => {
      root.classList.remove(cls);
      if (document.body) document.body.classList.remove(cls);
    });
    root.classList.add(`font-${fontFamily}`);
    if (document.body) document.body.classList.add(`font-${fontFamily}`);

    // Map exact font name for --font-app
    const fontMap: Record<FontFamily, string> = {
      jakarta: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      outfit: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      manrope: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
      sora: "'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    };
    root.style.setProperty('--font-app', fontMap[fontFamily] || fontMap.jakarta);
    if (document.body) {
      document.body.style.setProperty('--font-app', fontMap[fontFamily] || fontMap.jakarta);
    }

    // Apply Font Size scaling classes
    const fontSizeClasses = ['font-size-compact', 'font-size-standard', 'font-size-medium', 'font-size-large', 'font-size-xlarge'];
    fontSizeClasses.forEach(cls => root.classList.remove(cls));
    root.classList.add(`font-size-${fontSize}`);

    // Update meta theme-color for browser tab / mobile status bar
    const selectedThemeObj = THEME_OPTIONS.find(t => t.id === theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor && selectedThemeObj) {
      metaThemeColor.setAttribute('content', selectedThemeObj.bgHex);
    }

    localStorage.setItem('theme', theme);
    localStorage.setItem('primary_color', primaryColor);
    localStorage.setItem('custom_hex_color', customHex);
    localStorage.setItem('custom_gradient', JSON.stringify(customGradient));
    localStorage.setItem('gradient_preset', gradientPreset);
    localStorage.setItem('font_family', fontFamily);
    localStorage.setItem('font_size', fontSize);
  }, [theme, primaryColor, customHex, customGradient, gradientPreset, fontFamily, fontSize]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    db.settings.toCollection().first().then((current) => {
      if (current) {
        db.settings.update(current.id, { theme: newTheme });
      }
    }).catch(() => null);
  };

  const setPrimaryColor = (newColor: PrimaryColor) => {
    setPrimaryColorState(newColor);
    db.settings.toCollection().first().then((current) => {
      if (current) {
        db.settings.update(current.id, { primaryColor: newColor });
      }
    }).catch(() => null);
  };

  const setCustomHex = (hex: string) => {
    setCustomHexState(hex);
    setPrimaryColorState('custom');
    db.settings.toCollection().first().then((current) => {
      if (current) {
        db.settings.update(current.id, { primaryColor: hex });
      }
    }).catch(() => null);
  };

  const setCustomGradient = (grad: CustomGradient) => {
    setCustomGradientState(grad);
    setPrimaryColorState('gradient');
    db.settings.toCollection().first().then((current) => {
      if (current) {
        db.settings.update(current.id, { primaryColor: grad.from });
      }
    }).catch(() => null);
  };

  const setGradientPreset = (presetId: string) => {
    setGradientPresetState(presetId);
    const preset = GRADIENT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCustomGradient({ from: preset.fromHex, to: preset.toHex, angle: 135 });
    }
  };

  const setFontFamily = (newFont: FontFamily) => {
    setFontFamilyState(newFont);
    db.settings.toCollection().first().then((current) => {
      if (current) {
        db.settings.update(current.id, { fontFamily: newFont });
      }
    }).catch(() => null);
  };

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
    db.settings.toCollection().first().then((current) => {
      if (current) {
        db.settings.update(current.id, { fontSize: newSize });
      }
    }).catch(() => null);
  };

  const toggleTheme = () => {
    const isDark = DARK_THEMES.some(t => t.id === theme);
    setTheme(isDark ? 'light' : 'dark');
  };

  const isDarkTheme = DARK_THEMES.some(t => t.id === theme);

  const value = {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    customHex,
    setCustomHex,
    customGradient,
    setCustomGradient,
    gradientPreset,
    setGradientPreset,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    toggleTheme,
    isDarkTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};

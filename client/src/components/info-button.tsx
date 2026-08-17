import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InfoButtonProps {
  title: string;
  description: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
  size?: 'xs' | 'sm' | 'default';
}

export function InfoButton({
  title,
  description,
  align = 'end',
  side = 'bottom',
  className,
  iconClassName,
  size = 'xs'
}: InfoButtonProps) {
  const [open, setOpen] = useState(false);

  const sizeClasses = {
    xs: 'w-5 h-5 min-w-[20px] min-h-[20px] p-0',
    sm: 'w-6 h-6 min-w-[24px] min-h-[24px] p-0',
    default: 'w-7 h-7 min-w-[28px] min-h-[28px] p-0'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    default: 'w-4 h-4'
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(prev => !prev);
          }}
          aria-label={`Information about ${title}`}
          title={`What is ${title}?`}
          className={cn(
            "rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-90 tap-spring border border-transparent hover:border-primary/20",
            sizeClasses[size],
            open && "text-primary bg-primary/15 border-primary/30",
            className
          )}
        >
          <Info className={cn(iconSizes[size], "stroke-[2.2]", iconClassName)} />
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        align={align}
        side={side}
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-72 sm:w-80 p-3.5 rounded-2xl shadow-xl z-[90] bg-card border border-border text-card-foreground text-xs leading-relaxed animate-in fade-in-0 zoom-in-95"
      >
        <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Info className="w-3 h-3 stroke-[2.5]" />
            </div>
            <span className="font-bold text-xs text-foreground truncate">{title}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="pt-2 text-muted-foreground space-y-1.5 font-normal">
          {typeof description === 'string' ? (
            <p className="text-[11px] leading-relaxed">{description}</p>
          ) : (
            description
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

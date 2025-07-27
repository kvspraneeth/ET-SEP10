import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="floating-action-btn w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg"
      size="icon"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}

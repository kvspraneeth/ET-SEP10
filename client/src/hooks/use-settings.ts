import { useLiveQuery } from 'dexie-react-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import db from '@/lib/db';
import { Settings, InsertSettings } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export function useSettings() {
  const settings = useLiveQuery(() => 
    db.settings.get('default')
  );

  return settings;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      await db.settings.update('default', updates);
      return updates;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to update settings:', error);
    },
  });
}

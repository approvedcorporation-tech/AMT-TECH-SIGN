import { AppData } from '../types';
import { supabase } from '../lib/supabase';

export const loadCloudData = async (): Promise<AppData | null> => {
  const { data, error } = await supabase
    .from('app_config')
    .select('data')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Failed to load cloud data', error);
    return null;
  }

  return (data?.data as AppData) || null;
};

export const saveCloudData = async (appData: AppData): Promise<void> => {
  const { error } = await supabase
    .from('app_config')
    .update({ data: appData })
    .eq('id', 1);

  if (error) {
    console.error('Failed to save cloud data', error);
    throw error;
  }
};

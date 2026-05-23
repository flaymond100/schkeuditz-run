import { supabase } from './supabase';

export type RaceCategory = {
  id: string;
  label: string;
};

export async function fetchRaceCategories(): Promise<RaceCategory[]> {
  const { data, error } = await supabase
    .from('schkeuditz_categories')
    .select('id, label')
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as RaceCategory[];
}

export function createRaceCategoryLabelMap(
  categories: RaceCategory[]
): Map<string, string> {
  return new Map(categories.map(category => [category.id, category.label]));
}

export function resolveRaceCategoryLabel(
  value: string,
  categoryLabels: Map<string, string>
): string {
  return categoryLabels.get(value) ?? value;
}

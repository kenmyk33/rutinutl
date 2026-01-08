import { supabase } from './supabase';

export interface SearchResult {
  id: string;
  name: string;
  image_url: string | null;
  location_marker_id: string;
  location_name: string | null;
  storage_image_id: string;
  x_position: number;
  y_position: number;
}

export async function searchTools(
  query: string,
  userId: string
): Promise<SearchResult[]> {
  if (!query.trim() || !userId) {
    return [];
  }

  const searchPattern = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from('tools')
    .select(`
      id,
      name,
      image_url,
      location_marker_id,
      location_markers!inner (
        id,
        name,
        storage_image_id,
        x_position,
        y_position
      )
    `)
    .eq('user_id', userId)
    .ilike('name', searchPattern)
    .order('name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Search error:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((tool: any) => ({
    id: tool.id,
    name: tool.name,
    image_url: tool.image_url,
    location_marker_id: tool.location_marker_id,
    location_name: tool.location_markers?.name || null,
    storage_image_id: tool.location_markers?.storage_image_id || '',
    x_position: tool.location_markers?.x_position || 0,
    y_position: tool.location_markers?.y_position || 0,
  }));
}

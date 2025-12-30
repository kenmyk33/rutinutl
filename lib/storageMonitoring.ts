import { supabase } from './supabase';

/**
 * Get storage usage for a specific user
 * Reads from storage_images and tools tables for accurate file size tracking
 */
export async function getUserStorageUsage(userId: string): Promise<{
  fileCount: number;
  totalSizeBytes: number;
  totalSize: string;
}> {
  try {
    const { data: images, error: imagesError } = await supabase
      .from('storage_images')
      .select('file_size')
      .eq('user_id', userId);

    if (imagesError) {
      console.error('Error fetching storage images:', imagesError);
    }

    const { data: tools, error: toolsError } = await supabase
      .from('tools')
      .select('file_size')
      .eq('user_id', userId)
      .gt('file_size', 0);

    if (toolsError) {
      console.error('Error fetching tool images:', toolsError);
    }

    const imageCount = images?.length || 0;
    const toolImageCount = tools?.length || 0;
    const fileCount = imageCount + toolImageCount;

    const imageSizeBytes = images?.reduce((sum, img) => sum + (img.file_size || 0), 0) || 0;
    const toolSizeBytes = tools?.reduce((sum, tool) => sum + (tool.file_size || 0), 0) || 0;
    const totalSizeBytes = imageSizeBytes + toolSizeBytes;

    return {
      fileCount,
      totalSizeBytes,
      totalSize: formatBytes(totalSizeBytes)
    };
  } catch (error) {
    console.error('Error fetching user storage usage:', error);
    return {
      fileCount: 0,
      totalSizeBytes: 0,
      totalSize: '0 Bytes'
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

import { supabase } from './supabase';

export interface DeleteImageResult {
  success: boolean;
  error?: string;
}

export async function deleteStorageImage(
  storageImageId: string,
  imageUri: string
): Promise<DeleteImageResult> {
  try {
    console.log('[Delete] Starting deletion process for image:', storageImageId);

    // Extract file path from signed URL (format: userId/filename.jpg)
    // Handle both old format (uploads/...) and new format (userId/...)
    const urlWithoutQuery = imageUri.split('?')[0]; // Remove query params from signed URLs
    const filePathMatch = urlWithoutQuery.match(/([a-f0-9-]{36}\/[^/]+)$/) || // New format: userId/filename
                          urlWithoutQuery.match(/uploads\/(.+)$/); // Old format: uploads/filename

    if (filePathMatch && filePathMatch[1]) {
      const filePath = filePathMatch[1];
      console.log('[Delete] Attempting to delete file from storage:', filePath);

      const { error: storageError } = await supabase.storage
        .from('storage-images')
        .remove([filePath]);

      if (storageError) {
        console.warn('[Delete] Failed to delete file from storage:', storageError.message);
      } else {
        console.log('[Delete] ✓ File deleted from storage successfully');
      }
    } else {
      console.warn('[Delete] Could not extract file path from URI:', imageUri);
    }

    console.log('[Delete] Deleting database record...');
    const { error: dbError } = await supabase
      .from('storage_images')
      .delete()
      .eq('id', storageImageId);

    if (dbError) {
      console.error('[Delete] ✗ Failed to delete database record:', dbError);
      return {
        success: false,
        error: dbError.message,
      };
    }

    console.log('[Delete] ✓ Database record deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[Delete] ✗ Unexpected error during deletion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteMultipleStorageImages(
  imageIds: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const imageId of imageIds) {
    const { data: image } = await supabase
      .from('storage_images')
      .select('image_uri')
      .eq('id', imageId)
      .maybeSingle();

    if (!image) {
      failed++;
      errors.push(`Image ${imageId} not found`);
      continue;
    }

    const result = await deleteStorageImage(imageId, image.image_uri);
    if (result.success) {
      success++;
    } else {
      failed++;
      if (result.error) {
        errors.push(result.error);
      }
    }
  }

  return { success, failed, errors };
}

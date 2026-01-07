import { supabase } from './supabase';

/**
 * Backfill file sizes for storage images and tool images that have file_size = 0
 * This reads the actual file size from Supabase Storage and updates the database
 */
export async function backfillFileSizes(userId: string): Promise<{
  success: boolean;
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Get all storage images with file_size = 0 for this user
    const { data: images, error: queryError } = await supabase
      .from('storage_images')
      .select('id, image_uri')
      .eq('user_id', userId)
      .eq('file_size', 0);

    if (queryError) {
      errors.push(`Failed to query storage images: ${queryError.message}`);
    }

    // Get all tools with images but file_size = 0 for this user
    const { data: tools, error: toolsQueryError } = await supabase
      .from('tools')
      .select('id, image_url')
      .eq('user_id', userId)
      .eq('file_size', 0)
      .not('image_url', 'is', null);

    if (toolsQueryError) {
      errors.push(`Failed to query tool images: ${toolsQueryError.message}`);
    }

    if ((!images || images.length === 0) && (!tools || tools.length === 0)) {
      return { success: errors.length === 0, updated: 0, errors };
    }

        // Process each image
    if (images) {
      for (const image of images) {
        try {
        // Extract the storage path from the image_uri
        const path = extractStoragePathFromUri(image.image_uri, userId);

        if (!path) {
          errors.push(`Could not extract path from: ${image.image_uri}`);
          continue;
        }

        // List the file to get its metadata
        const { data: files, error: listError } = await supabase.storage
          .from('storage-images')
          .list(userId, {
            search: path.split('/').pop() // Get just the filename
          });

        if (listError) {
          errors.push(`Failed to list file ${path}: ${listError.message}`);
          continue;
        }

        const file = files?.find(f => f.name === path.split('/').pop());

        if (!file || !file.metadata?.size) {
          // Try to fetch the file to get its size
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('storage-images')
            .download(path);

          if (downloadError || !fileData) {
            errors.push(`Could not get size for ${path}`);
            continue;
          }

          // Update with the blob size
          const fileSize = fileData.size;
          const { error: updateError } = await supabase
            .from('storage_images')
            .update({ file_size: fileSize })
            .eq('id', image.id);

          if (updateError) {
            errors.push(`Failed to update ${image.id}: ${updateError.message}`);
          } else {
            updated++;
          }
        } else {
          // Update with the metadata size
          const { error: updateError } = await supabase
            .from('storage_images')
            .update({ file_size: file.metadata.size })
            .eq('id', image.id);

          if (updateError) {
            errors.push(`Failed to update ${image.id}: ${updateError.message}`);
          } else {
            updated++;
          }
      } catch (error) {
        errors.push(`Error processing image ${image.id}: ${error}`);
      }
    }
  }
    // Process each tool image
    for (const tool of tools || []) {
      try {
        // Extract the storage path from the image_url
        const path = extractStoragePathFromUri(tool.image_url, userId);

        if (!path) {
          errors.push(`Could not extract path from: ${tool.image_url}`);
          continue;
        }

        // List the file to get its metadata
        const { data: files, error: listError } = await supabase.storage
          .from('storage-images')
          .list(userId, {
            search: path.split('/').pop() // Get just the filename
          });

        if (listError) {
          errors.push(`Failed to list file ${path}: ${listError.message}`);
          continue;
        }

        const file = files?.find(f => f.name === path.split('/').pop());

        if (!file || !file.metadata?.size) {
          // Try to fetch the file to get its size
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('storage-images')
            .download(path);

          if (downloadError || !fileData) {
            errors.push(`Could not get size for ${path}`);
            continue;
          }

          // Update with the blob size
          const fileSize = fileData.size;
          const { error: updateError } = await supabase
            .from('tools')
            .update({ file_size: fileSize })
            .eq('id', tool.id);

          if (updateError) {
            errors.push(`Failed to update tool ${tool.id}: ${updateError.message}`);
          } else {
            updated++;
          }
        } else {
          // Update with the metadata size
          const { error: updateError } = await supabase
            .from('tools')
            .update({ file_size: file.metadata.size })
            .eq('id', tool.id);

          if (updateError) {
            errors.push(`Failed to update tool ${tool.id}: ${updateError.message}`);
          } else {
            updated++;
          }
        }
      } catch (error) {
        errors.push(`Error processing tool ${tool.id}: ${error}`);
      }
    }

    return { success: errors.length === 0, updated, errors };
  } catch (error) {
    errors.push(`Unexpected error: ${error}`);
    return { success: false, updated, errors };
  }
}

/**
 * Extract the storage path from a Supabase storage URL
 */
function extractStoragePathFromUri(uri: string, userId: string): string | null {
  try {
    // Handle signed URLs
    if (uri.includes('/storage/v1/object/sign/storage-images/')) {
      const match = uri.match(/\/storage\/v1\/object\/sign\/storage-images\/(.+?)\?/);
      return match ? match[1] : null;
    }

    // Handle public URLs
    if (uri.includes('/storage/v1/object/public/storage-images/')) {
      const match = uri.match(/\/storage\/v1\/object\/public\/storage-images\/(.+)$/);
      return match ? match[1] : null;
    }

    return null;
  } catch {
    return null;
  }
}

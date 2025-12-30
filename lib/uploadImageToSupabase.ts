import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { decode as base64Decode } from 'base-64';
import { supabase } from './supabase';
import { compressImage, formatFileSize } from './imageProcessor';
import { checkStorageLimit } from './storageLimit';

export interface UploadOptions {
  fileName?: string;
  bucket?: string;
  compress?: boolean;
  maxRetries?: number;
  onProgress?: (progress: number) => void;
  userId: string; // Required for authenticated storage access
}

export interface UploadResult {
  url: string;
  size: number;
  compressed: boolean;
}

/**
 * Upload an image from a local URI to Supabase Storage with retry logic and compression.
 *
 * EXPO GO COMPATIBLE VERSION - ENHANCED
 * - Uses base64 approach which works reliably in Expo Go
 * - Automatic image compression before upload
 * - Retry logic with exponential backoff
 * - Progress tracking support
 */
export async function uploadImageToSupabase(
  uri: string,
  options: UploadOptions
): Promise<UploadResult> {
  const {
    fileName,
    bucket = 'storage-images',
    compress = true,
    maxRetries = 3,
    onProgress,
    userId,
  } = options;
  let fileExtension = 'jpg';
  let processedUri = uri;
  let wasCompressed = false;

  try {
    console.log('[Upload] Starting upload process...');
    console.log('[Upload] URI:', uri);
    console.log('[Upload] Platform:', Platform.OS);
    console.log('[Upload] Bucket:', bucket);
    console.log('[Upload] Compression enabled:', compress);

    // Pre-validate URI format
    const preValidation = validateImageFile(uri);
    if (!preValidation.valid) {
      throw new Error(preValidation.error || 'File validation failed');
    }

    onProgress?.(10);

    // Compress image if enabled
    if (compress) {
      console.log('[Upload] Compressing image...');
      try {
        const compressed = await compressImage(uri, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
        });
        processedUri = compressed.uri;
        wasCompressed = true;
        console.log('[Upload] ✓ Image compressed successfully');
      } catch (compressionError) {
        console.warn('[Upload] Compression failed, using original:', compressionError);
        processedUri = uri;
      }
      onProgress?.(30);
    }

    fileExtension = extractExtensionFromUri(processedUri);
    const mimeType = getMimeType(fileExtension);
    console.log('[Upload] Extension:', fileExtension, 'MIME:', mimeType);

    onProgress?.(40);

    // FIXED: Use base64 string directly - works in Expo Go
    // Read file as base64
    console.log('[Upload] Reading file as base64...');
    const base64 = await FileSystemLegacy.readAsStringAsync(processedUri, {
      encoding: 'base64',
    });
    console.log('[Upload] Base64 length:', base64.length);

    // Validate file size from base64 (approximate)
    const estimatedSize = (base64.length * 3) / 4;
    console.log('[Upload] Estimated file size:', formatFileSize(estimatedSize));

    const sizeValidation = validateImageFile(processedUri, estimatedSize, mimeType);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error || 'File validation failed');
    }

    // Check storage limits for the authenticated user
    console.log('[Upload] Checking storage limits for user:', userId);
    const storageCheck = await checkStorageLimit(userId, estimatedSize);

    if (!storageCheck.allowed) {
      console.error('[Upload] ✗ Storage limit exceeded');
      throw new Error(storageCheck.message || 'Storage limit exceeded');
    }

    if (storageCheck.warningMessage) {
      console.warn('[Upload] ⚠ Storage warning:', storageCheck.warningMessage);
    }

    console.log('[Upload] ✓ Storage check passed');

    console.log('[Upload] ✓ Validation passed');
    onProgress?.(50);

    // Generate unique filename with user-specific path
    const sanitizedName = fileName
      ? fileName.replace(/[^a-zA-Z0-9-_]/g, '-')
      : `image-${Date.now()}`;
    const uniqueFileName = `${sanitizedName}-${Date.now()}.${fileExtension}`;
    const storagePath = `${userId}/${uniqueFileName}`;
    console.log('[Upload] Storage path:', storagePath);

    // FIXED: Convert base64 to binary for upload
    // Decode base64 to raw bytes
    console.log('[Upload] Decoding base64 to binary...');
    let bytes: Uint8Array;
    try {
      const binaryString = base64Decode(base64);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log('[Upload] Binary data size:', formatFileSize(bytes.length));
      console.log('[Upload] Binary conversion successful');
    } catch (decodeError) {
      console.error('[Upload] Failed to decode base64:', decodeError);
      throw new Error('Failed to process image data for upload');
    }

    onProgress?.(60);

    // Upload with retry logic
    const uploadData = await uploadWithRetry(
      bucket,
      storagePath,
      bytes.buffer as ArrayBuffer,
      mimeType,
      maxRetries,
      (retryProgress) => {
        onProgress?.(60 + retryProgress * 0.3);
      }
    );

    console.log('[Upload] ✓ Upload successful:', uploadData);
    onProgress?.(90);

    // Get signed URL (private bucket access with 24 hour expiration)
    console.log('[Upload] Generating signed URL...');
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 86400); // 24 hours in seconds

    if (urlError || !urlData?.signedUrl) {
      console.error('[Upload] ✗ Failed to generate signed URL:', urlError);
      throw new Error('Failed to generate signed URL');
    }

    console.log('[Upload] ✓ Signed URL generated');
    console.log('[Upload] ========== UPLOAD COMPLETE ==========');
    onProgress?.(100);

    return {
      url: urlData.signedUrl,
      size: estimatedSize,
      compressed: wasCompressed,
    };
  } catch (error) {
    console.error('[Upload] ========== UPLOAD FAILED ==========');
    console.error('[Upload] Error type:', error?.constructor?.name);
    console.error('[Upload] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Upload] Full error:', error);
    throw error instanceof Error
      ? error
      : new Error(`Upload failed: ${String(error)}`);
  }
}

/**
 * Validation configuration
 */
const VALIDATION_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  maxSizeMB: 10,
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
};

/**
 * Validate image file before upload
 */
export function validateImageFile(
  uri: string,
  fileSize?: number,
  mimeType?: string
): { valid: boolean; error?: string } {
  console.log('[Validation] Checking file:', { uri, fileSize, mimeType });

  // Check file extension
  const extension = extractExtensionFromUri(uri);
  if (!VALIDATION_CONFIG.allowedFormats.includes(extension)) {
    const error = `Invalid file format. Allowed: ${VALIDATION_CONFIG.allowedFormats.join(', ')}`;
    console.error('[Validation] ✗ Format check failed:', error);
    return { valid: false, error };
  }

  // Check MIME type if provided
  if (mimeType && !VALIDATION_CONFIG.allowedMimeTypes.includes(mimeType.toLowerCase())) {
    const error = `Invalid MIME type: ${mimeType}`;
    console.error('[Validation] ✗ MIME type check failed:', error);
    return { valid: false, error };
  }

  // Check file size if provided
  if (fileSize !== undefined) {
    if (fileSize === 0) {
      const error = 'File is empty (0 bytes)';
      console.error('[Validation] ✗ Size check failed:', error);
      return { valid: false, error };
    }
    if (fileSize > VALIDATION_CONFIG.maxSizeBytes) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      const error = `File too large (${sizeMB}MB). Maximum: ${VALIDATION_CONFIG.maxSizeMB}MB`;
      console.error('[Validation] ✗ Size check failed:', error);
      return { valid: false, error };
    }
  }

  console.log('[Validation] ✓ All checks passed');
  return { valid: true };
}

/**
 * Extract file extension from URI
 */
function extractExtensionFromUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  return validExtensions.includes(ext) ? ext : 'jpg';
}

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

/**
 * Upload with retry logic and exponential backoff
 */
async function uploadWithRetry(
  bucket: string,
  path: string,
  data: ArrayBuffer,
  contentType: string,
  maxRetries: number,
  onProgress?: (progress: number) => void
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Upload] Attempt ${attempt + 1}/${maxRetries}`);
      console.log(`[Upload] Using fetch implementation: ${typeof global.fetch}`);
      console.log(`[Upload] Data type: ${data.constructor.name}, size: ${data.byteLength} bytes`);
      onProgress?.((attempt + 0.5) / maxRetries);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, data, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error('[Upload] Supabase upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      console.log('[Upload] ✓ Upload successful on attempt', attempt + 1);
      onProgress?.(1);
      return uploadData;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Upload] Attempt ${attempt + 1} failed:`, {
        message: lastError.message,
        name: lastError.name,
        stack: lastError.stack?.split('\n')[0],
      });

      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[Upload] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[Upload] ✗ All retry attempts failed');
  console.error('[Upload] Final error details:', lastError);
  throw new Error(
    `Upload failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Legacy function signature for backward compatibility
 * @deprecated Use uploadImageToSupabase with userId parameter
 */
export async function uploadImage(
  uri: string,
  userId: string,
  fileName?: string,
  bucket?: string
): Promise<string> {
  const result = await uploadImageToSupabase(uri, {
    userId,
    fileName,
    bucket,
    compress: true
  });
  return result.url;
}

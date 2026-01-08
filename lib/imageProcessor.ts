import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number;
}

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  originalSize?: number;
  processedSize: number;
  compressionRatio?: number;
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  targetSizeKB: 2048,
};

export async function compressImage(
  uri: string,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    console.log('[ImageProcessor] Starting compression...');
    console.log('[ImageProcessor] Options:', opts);

    const imageInfo = await ImageManipulator.manipulateAsync(
      uri,
      [],
      {
        compress: opts.quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[ImageProcessor] Initial compression complete');
    console.log('[ImageProcessor] Dimensions:', `${imageInfo.width}x${imageInfo.height}`);

    const actions: ImageManipulator.Action[] = [];
    let currentWidth = imageInfo.width;
    let currentHeight = imageInfo.height;

    if (currentWidth > opts.maxWidth || currentHeight > opts.maxHeight) {
      const widthRatio = opts.maxWidth / currentWidth;
      const heightRatio = opts.maxHeight / currentHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      const newWidth = Math.round(currentWidth * ratio);
      const newHeight = Math.round(currentHeight * ratio);

      actions.push({
        resize: {
          width: newWidth,
          height: newHeight,
        },
      });

      currentWidth = newWidth;
      currentHeight = newHeight;

      console.log('[ImageProcessor] Resizing to:', `${newWidth}x${newHeight}`);
    }

    let finalImage = imageInfo;
    if (actions.length > 0) {
      finalImage = await ImageManipulator.manipulateAsync(
        imageInfo.uri,
        actions,
        {
          compress: opts.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
    }

    console.log('[ImageProcessor] ✓ Processing complete');
    console.log('[ImageProcessor] Final URI:', finalImage.uri);

    return {
      uri: finalImage.uri,
      width: finalImage.width,
      height: finalImage.height,
      processedSize: 0,
    };
  } catch (error) {
    console.error('[ImageProcessor] Error:', error);
    throw new Error(
      `Image processing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function createThumbnail(
  uri: string,
  size: number = 200
): Promise<string> {
  try {
    console.log('[ImageProcessor] Creating thumbnail, size:', size);

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: size,
            height: size,
          },
        },
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[ImageProcessor] ✓ Thumbnail created:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('[ImageProcessor] Thumbnail error:', error);
    throw new Error(
      `Thumbnail creation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function rotateImage(
  uri: string,
  degrees: number
): Promise<string> {
  try {
    console.log('[ImageProcessor] Rotating image by', degrees, 'degrees');

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ rotate: degrees }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[ImageProcessor] ✓ Image rotated:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('[ImageProcessor] Rotation error:', error);
    throw new Error(
      `Image rotation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function estimateSizeFromBase64(base64String: string): number {
  return Math.ceil((base64String.length * 3) / 4);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

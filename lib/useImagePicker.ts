import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type ImagePickerSource = 'camera' | 'gallery';

export interface PickedImage {
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

export interface UseImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
}

export function useImagePicker(options: UseImagePickerOptions = {}) {
  const [isPickingImage, setIsPickingImage] = useState(false);

  const pickImages = async (
    source: ImagePickerSource = 'gallery'
  ): Promise<PickedImage[] | null> => {
    try {
      setIsPickingImage(true);
      console.log('[ImagePicker] Starting image selection from:', source);

      let permissionResult;
      let launchFunction;

      if (source === 'camera') {
        console.log('[ImagePicker] Requesting camera permissions...');
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        launchFunction = ImagePicker.launchCameraAsync;

        if (!permissionResult.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to take photos.'
          );
          return null;
        }
      } else {
        console.log('[ImagePicker] Requesting media library permissions...');
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        launchFunction = ImagePicker.launchImageLibraryAsync;

        if (!permissionResult.granted) {
          Alert.alert(
            'Photo Library Permission Required',
            'Please allow photo library access to select images.'
          );
          return null;
        }
      }

      console.log('[ImagePicker] ✓ Permission granted');
      console.log('[ImagePicker] Launching picker...');

      const result = await launchFunction({
        mediaTypes: ['images'],
        allowsEditing: options.allowsEditing ?? true,
        allowsMultipleSelection: options.allowsMultipleSelection ?? false,
        aspect: options.aspect,
        quality: options.quality ?? 0.8,
      });

      if (result.canceled) {
        console.log('[ImagePicker] User canceled selection');
        return null;
      }

      if (!result.assets || result.assets.length === 0) {
        console.warn('[ImagePicker] No assets returned');
        return null;
      }

      const images: PickedImage[] = result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName || undefined,
        mimeType: asset.mimeType || undefined,
        fileSize: asset.fileSize || undefined,
        width: asset.width || undefined,
        height: asset.height || undefined,
      }));

      console.log(`[ImagePicker] ✓ ${images.length} image(s) selected`);
      images.forEach((img, index) => {
        console.log(`[ImagePicker] Image ${index + 1}:`, {
          fileName: img.fileName,
          type: img.mimeType,
          size: img.fileSize,
          dimensions: `${img.width}x${img.height}`,
        });
      });

      return images;
    } catch (error) {
      console.error('[ImagePicker] Error:', error);
      Alert.alert(
        'Error',
        `Failed to ${source === 'camera' ? 'take photo' : 'select image'}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    } finally {
      setIsPickingImage(false);
    }
  };

  const pickImage = async (
    source: ImagePickerSource = 'gallery'
  ): Promise<PickedImage | null> => {
    const results = await pickImages(source);
    return results && results.length > 0 ? results[0] : null;
  };

  const pickFromGallery = () => pickImage('gallery');
  const pickFromCamera = () => pickImage('camera');
  const pickMultipleFromGallery = () => pickImages('gallery');

  return {
    pickImage,
    pickImages,
    pickFromGallery,
    pickFromCamera,
    pickMultipleFromGallery,
    isPickingImage,
  };
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  ActionSheetIOS,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Plus, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, type StorageImage, type LocationMarker } from '../../lib/supabase';
import { uploadImageToSupabase, validateImageFile, type UploadOptions } from '../../lib/uploadImageToSupabase';
import { useImagePicker } from '../../lib/useImagePicker';
import { formatFileSize } from '../../lib/imageProcessor';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { subscribeToDataCleared } from '../../lib/refreshEvents';

interface StorageLocationWithMarkers extends StorageImage {
  markers: LocationMarker[];
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { canAddImage, canAddLocation, refreshUsage, limits, usage } = useSubscription();

  const tabBarHeight = Platform.OS === 'android' ? 70 + insets.bottom : 65 + insets.bottom;
  const calculatedHeight = Math.round(windowHeight - tabBarHeight - insets.top);

  const stableDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  if (stableDimensionsRef.current === null) {
    stableDimensionsRef.current = { width: windowWidth, height: calculatedHeight };
  } else {
    const widthDiff = Math.abs(stableDimensionsRef.current.width - windowWidth);
    const heightDiff = Math.abs(stableDimensionsRef.current.height - calculatedHeight);
    if (widthDiff > 50 || heightDiff > 100) {
      stableDimensionsRef.current = { width: windowWidth, height: calculatedHeight };
    }
  }

  const contentHeight = stableDimensionsRef.current.height;
  const stableWidth = stableDimensionsRef.current.width;
  const { scrollToIndex, reload, highlightMarkerId } = useLocalSearchParams<{
    scrollToIndex?: string;
    reload?: string;
    highlightMarkerId?: string;
  }>();
  const { pickFromGallery, pickFromCamera, isPickingImage } = useImagePicker({
    allowsEditing: false,
    quality: 0.8,
  });

  const [locations, setLocations] = useState<StorageLocationWithMarkers[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const loadingRef = useRef(false);
  const lastScrolledIndexRef = useRef<string | null>(null);
  const savedScrollIndexRef = useRef<number>(0);
  const isNavigatingToDetailsRef = useRef(false);
  const isFlatListReadyRef = useRef<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const needsRefreshRef = useRef(false);

  const loadLocations = async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      isFlatListReadyRef.current = false;

      const { data: storageImages, error: imageError } = await supabase
        .from('storage_images')
        .select('*')
        .eq('user_id', user?.id)
        .order('order_index', { ascending: true });

      if (imageError) {
        console.error('Error loading images:', imageError);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      if (!storageImages || storageImages.length === 0) {
        setLocations([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const locationsWithMarkers = await Promise.all(
        storageImages.map(async (image) => {
          const { data: markers } = await supabase
            .from('location_markers')
            .select('*')
            .eq('storage_image_id', image.id);

          return {
            ...image,
            markers: markers || [],
          };
        })
      );

      setLocations(locationsWithMarkers);
      setLoading(false);
      loadingRef.current = false;
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        if (mounted) {
          if (reload === 'true') {
            isNavigatingToDetailsRef.current = false;
            lastScrolledIndexRef.current = null;
            router.replace({
              pathname: '/(tabs)/home',
              params: {},
            });
            await loadLocations();
          } else if (scrollToIndex && lastScrolledIndexRef.current !== scrollToIndex) {
            lastScrolledIndexRef.current = null;
            if (locations.length > 0) {
              isFlatListReadyRef.current = true;
            } else {
              await loadLocations();
            }
          } else if (isNavigatingToDetailsRef.current) {
            isNavigatingToDetailsRef.current = false;

            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                  index: savedScrollIndexRef.current,
                  animated: false,
                });
              }
            }, 50);
          } else if (lastScrolledIndexRef.current !== null) {
            if (needsRefreshRef.current) {
              needsRefreshRef.current = false;
              const indexToRestore = savedScrollIndexRef.current;
              await loadLocations();
              setTimeout(() => {
                if (flatListRef.current && mounted) {
                  const safeIndex = Math.min(indexToRestore, locations.length - 1);
                  if (safeIndex >= 0) {
                    flatListRef.current.scrollToIndex({
                      index: safeIndex,
                      animated: false,
                    });
                  }
                }
              }, 50);
            }
          } else if (locations.length === 0) {
            await loadLocations();
          }
        }
      };

      load();

      return () => {
        mounted = false;
        needsRefreshRef.current = true;
        savedScrollIndexRef.current = currentIndex;
        lastScrolledIndexRef.current = null;
      };
    }, [reload, router, scrollToIndex, locations.length])
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (scrollToIndex && locations.length > 0 && flatListRef.current && lastScrolledIndexRef.current !== scrollToIndex) {
      const targetIndex = parseInt(scrollToIndex, 10);

      if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < locations.length) {

        const attemptScroll = () => {
          try {
            flatListRef.current?.scrollToIndex({
              index: targetIndex,
              animated: false,
              viewPosition: 0,
            });
            setCurrentIndex(targetIndex);
            lastScrolledIndexRef.current = scrollToIndex;

            setTimeout(() => {
              router.replace({
                pathname: '/(tabs)/home',
                params: {},
              });
            }, 100);
          } catch (error) {
            console.error('Error scrolling to index:', error);
          }
        };

        if (isFlatListReadyRef.current) {
          timeoutId = setTimeout(attemptScroll, 100);
        } else {
          timeoutId = setTimeout(() => {
            if (isFlatListReadyRef.current) {
              attemptScroll();
            } else {
              setTimeout(attemptScroll, 500);
            }
          }, 300);
        }
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scrollToIndex, locations, router]);

  useEffect(() => {
    if (highlightMarkerId) {
      setHighlightedMarkerId(highlightMarkerId);

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        pulseAnimation.stop();
        pulseAnim.setValue(1);
        setHighlightedMarkerId(null);
      }, 3000);

      return () => {
        pulseAnimation.stop();
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
      };
    }
  }, [highlightMarkerId, pulseAnim]);

  useEffect(() => {
    const unsubscribe = subscribeToDataCleared(() => {
      loadingRef.current = false;
      loadLocations();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const showImageSourceOptions = useCallback(() => {
    if (!canAddImage()) {
      Alert.alert(
        'Image Limit Reached',
        `You've reached the maximum of ${limits.maxImages} images on your current plan. Upgrade to add more storage locations.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: () => router.push('/pricing') },
        ]
      );
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleImageSelection('camera');
          } else if (buttonIndex === 2) {
            handleImageSelection('gallery');
          }
        }
      );
    } else {
      Alert.alert(
        'Add Storage Location',
        'Choose where to get your image from',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => handleImageSelection('camera') },
          { text: 'Choose from Library', onPress: () => handleImageSelection('gallery') },
        ],
        { cancelable: true }
      );
    }
  }, [canAddImage, limits.maxImages, router]);


  const handleImageSelection = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      const pickedImage = source === 'camera'
        ? await pickFromCamera()
        : await pickFromGallery();

      if (!pickedImage) return;

      if (!user?.id) {
        Alert.alert('Authentication Required', 'Please sign in to upload images.');
        return;
      }

      const validation = validateImageFile(
        pickedImage.uri,
        pickedImage.fileSize,
        pickedImage.mimeType
      );

      if (!validation.valid) {
        Alert.alert('Invalid Image', validation.error || 'Please select a valid image file');
        return;
      }

      setUploading(true);

      try {
        const uploadOptions: UploadOptions = {
          fileName: pickedImage.fileName || 'storage-location',
          bucket: 'storage-images',
          compress: true,
          maxRetries: 3,
          userId: user.id,
        };

        const result = await uploadImageToSupabase(pickedImage.uri, uploadOptions);

        const nextOrderIndex = locations.length > 0
          ? Math.max(...locations.map(l => l.order_index)) + 1
          : 0;

        const { data: newImage, error } = await supabase
          .from('storage_images')
          .insert({
            user_id: user?.id,
            image_uri: result.url,
            name: `Storage ${locations.length + 1}`,
            order_index: nextOrderIndex,
            file_size: result.size,
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving image:', error);
          Alert.alert('Error', 'Could not save image.');
        } else {
          await loadLocations();
          await refreshUsage();
          Alert.alert('Success', 'New storage location added!');
        }
      } catch (uploadError: any) {
        console.error('Error uploading image:', uploadError);
        Alert.alert('Upload Failed', uploadError?.message || String(uploadError));
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error('Error in image selection:', error);
      Alert.alert('Error', 'An error occurred while processing the image.');
      setUploading(false);
    }
  }, [pickFromCamera, pickFromGallery, locations, loadLocations]);

  const handleImagePress = async (event: any, storageImageId: string, imageIndex: number) => {
    if (!canAddLocation(storageImageId)) {
      Alert.alert(
        'Location Limit Reached',
        `You've reached the maximum of ${limits.maxLocationsPerImage} locations per image on your current plan. Upgrade to add more.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: () => router.push('/pricing') },
        ]
      );
      return;
    }

    const nativeEvent = event.nativeEvent;
    let x: number;
    let y: number;

    if (nativeEvent.locationX !== undefined && nativeEvent.locationY !== undefined) {
      x = nativeEvent.locationX;
      y = nativeEvent.locationY;
    } else if (nativeEvent.offsetX !== undefined && nativeEvent.offsetY !== undefined) {
      x = nativeEvent.offsetX;
      y = nativeEvent.offsetY;
    } else if (nativeEvent.pageX !== undefined && nativeEvent.pageY !== undefined) {
      const target = event.currentTarget;
      if (target) {
        const rect = target.getBoundingClientRect?.();
        if (rect) {
          x = nativeEvent.pageX - rect.left - window.scrollX;
          y = nativeEvent.pageY - rect.top - window.scrollY;
        } else {
          return;
        }
      } else {
        return;
      }
    } else {
      return;
    }

    try {
      const { data: newMarker, error } = await supabase
        .from('location_markers')
        .insert({
          storage_image_id: storageImageId,
          x_position: x,
          y_position: y,
          name: null,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('[DB] Error creating marker:', error);
      } else {
        const savedIndex = currentIndex;
        await loadLocations();
        await refreshUsage();
        setTimeout(() => {
          if (flatListRef.current && savedIndex === imageIndex) {
            flatListRef.current.scrollToIndex({
              index: savedIndex,
              animated: false,
            });
          }
        }, 50);
      }
    } catch (error) {
      console.error('[DB] Exception creating marker:', error);
    }
  };

  const handleDotPress = useCallback((markerId: string) => {
    savedScrollIndexRef.current = currentIndex;
    isNavigatingToDetailsRef.current = true;

    router.push({
      pathname: '/details',
      params: { markerId },
    });
  }, [router, currentIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: contentHeight,
    offset: contentHeight * index,
    index,
  }), [contentHeight]);

  const handleScrollToIndexFailed = useCallback((info: any) => {
    flatListRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: false,
    });
    const wait = new Promise(resolve => setTimeout(resolve, 100));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: false,
        viewPosition: 0
      });
    });
  }, []);

  const styles = useMemo(
    () => createStyles(colors, isDark, stableWidth, contentHeight),
    [colors, isDark, stableWidth, contentHeight]
  );

  const dimensionKey = useMemo(
    () => `${stableWidth}-${contentHeight}`,
    [stableWidth, contentHeight]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </View>
    );
  }

  if (locations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your Storage Locations</Text>
          <Text style={styles.emptySubtitle}>
            Add photos of your closets, garage, attic, or any storage space
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={showImageSourceOptions}
            disabled={uploading || isPickingImage}
          >
            {uploading || isPickingImage ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Plus size={24} color={colors.text} />
                <Text style={styles.addButtonText}>Add Storage Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ marginTop: insets.top, height: contentHeight, overflow: 'hidden' }}>
        <FlatList
          key={dimensionKey}
          ref={flatListRef}
          data={locations}
          keyExtractor={(item) => item.id}
          extraData={dimensionKey}
          horizontal={false}
          pagingEnabled={false}
          snapToInterval={contentHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum={true}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onLayout={() => {
            isFlatListReadyRef.current = true;
          }}
          windowSize={5}
          maxToRenderPerBatch={3}
          removeClippedSubviews={false}
          initialNumToRender={2}
          renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => handleImagePress(e, item.id, index)}
            style={styles.imageContainer}
          >
            <Image
  source={{ uri: item.image_uri }}
  style={styles.image}
  resizeMode="cover"
/>
            {item.markers.map((marker: LocationMarker) => {
              const isHighlighted = highlightedMarkerId === marker.id;
              const MarkerComponent = isHighlighted ? Animated.View : TouchableOpacity;
              const dotSize = isHighlighted ? 35 : 30;
              const offset = dotSize / 2;

              return (
                <TouchableOpacity
                  key={marker.id}
                  style={[
                    styles.dot,
                    isHighlighted && styles.dotHighlighted,
                    {
                      left: Number(marker.x_position) - offset,
                      top: Number(marker.y_position) - offset,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                    },
                  ]}
                  onPress={() => handleDotPress(marker.id)}
                  activeOpacity={isHighlighted ? 1 : 0.7}
                >
                  <MarkerComponent
                    style={[
                      isHighlighted && {
                        transform: [{ scale: pulseAnim }],
                        width: '100%',
                        height: '100%',
                        borderRadius: dotSize / 2,
                        backgroundColor: isHighlighted ? colors.warning : colors.accent,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <View style={styles.dotInner} />
                  </MarkerComponent>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        )}
        />
      </View>

      <View style={[styles.paginationContainer, { bottom: Platform.OS === 'android' ? 90 + insets.bottom : 85 + insets.bottom }]}>
        {locations.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      <View style={[styles.bottomButtonContainer, { bottom: Platform.OS === 'android' ? 70 + insets.bottom : 65 + insets.bottom }]}>
        <TouchableOpacity
          style={styles.bottomAddButton}
          onPress={showImageSourceOptions}
          disabled={uploading || isPickingImage}
        >
          {uploading || isPickingImage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.bottomAddButtonText}>Add New Image</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, screenWidth: number, screenHeight: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    gap: 8,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dot: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  dotHighlighted: {
    backgroundColor: colors.warning,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  paginationContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)',
  },
  paginationDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
  bottomButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  bottomAddButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

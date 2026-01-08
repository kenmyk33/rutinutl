import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, Trash2, Edit2, X } from 'lucide-react-native';
import { supabase, type StorageImage, type LocationMarker } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { emitDataCleared } from '../../lib/refreshEvents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface StorageImageWithMarkers extends StorageImage {
  markerCount: number;
}

export default function GalleryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [storageImages, setStorageImages] = useState<StorageImageWithMarkers[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStorage, setSelectedStorage] = useState<StorageImageWithMarkers | null>(null);
  const [editedName, setEditedName] = useState('');
  const loadingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        if (mounted) {
          await loadStorageImages();
        }
      };

      load();

      return () => {
        mounted = false;
      };
    }, [])
  );

  const loadStorageImages = async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      const { data: images, error: imageError } = await supabase
        .from('storage_images')
        .select('*')
        .eq('user_id', user?.id)
        .order('order_index', { ascending: true });

      if (imageError) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      if (!images || images.length === 0) {
        setStorageImages([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const imagesWithMarkerCounts = await Promise.all(
        images.map(async (image) => {
          const { data: markers } = await supabase
            .from('location_markers')
            .select('id')
            .eq('storage_image_id', image.id)
            .eq('user_id', user?.id);

          return {
            ...image,
            markerCount: markers?.length || 0,
          };
        })
      );

      setStorageImages(imagesWithMarkerCounts);
      setLoading(false);
      loadingRef.current = false;
    } catch (error) {
      setStorageImages([]);
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleImagePress = (imageIndex: number) => {
    router.push({
      pathname: '/(tabs)/home',
      params: { scrollToIndex: imageIndex },
    });
  };

  const openEditModal = (storage: StorageImageWithMarkers, index: number) => {
    setSelectedStorage(storage);
    setEditedName(storage.name || `Storage ${index + 1}`);
  };

  const closeEditModal = () => {
    setSelectedStorage(null);
    setEditedName('');
  };

  const saveStorageName = async () => {
    if (!selectedStorage) return;

    try {
      const { error } = await supabase
        .from('storage_images')
        .update({ name: editedName.trim() || null })
        .eq('id', selectedStorage.id);

      if (error) {
        Alert.alert('Error', 'Failed to save storage name');
      } else {
        await loadStorageImages();
        closeEditModal();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save storage name');
    }
  };

  const handleDeleteImage = (image: StorageImageWithMarkers, index: number) => {
    Alert.alert(
      'Delete Storage Location',
      `Are you sure you want to delete "${image.name || `Storage ${index + 1}`}"?\n\nThis will also delete all ${image.markerCount} location markers and their associated tools.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteStorageImage(image.id),
        },
      ]
    );
  };

  const deleteStorageImage = async (imageId: string) => {
    try {
      const { data: markers } = await supabase
        .from('location_markers')
        .select('id')
        .eq('storage_image_id', imageId)
        .eq('user_id', user?.id);

      if (markers && markers.length > 0) {
        const markerIds = markers.map((m) => m.id);

        await supabase
          .from('tools')
          .delete()
          .in('location_marker_id', markerIds)
          .eq('user_id', user?.id);

        await supabase
          .from('location_markers')
          .delete()
          .eq('storage_image_id', imageId)
          .eq('user_id', user?.id);
      }

      const { error } = await supabase
        .from('storage_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user?.id);

      if (error) {
        Alert.alert('Error', 'Failed to delete storage location.');
      } else {
        await loadStorageImages();
        emitDataCleared();
        Alert.alert('Success', 'Storage location deleted successfully.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while deleting the storage location.');
    }
  };

  const styles = createStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </View>
    );
  }

  if (storageImages.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Storage Locations</Text>
          <Text style={styles.emptySubtitle}>
            Add storage photos on the Home screen to see them here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Storage Gallery</Text>
        <Text style={styles.headerSubtitle}>{storageImages.length} storage locations</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {storageImages.map((image, index) => (
            <View key={image.id} style={styles.cardWrapper}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleImagePress(index)}
                activeOpacity={0.8}
              >
               <Image
  source={{ uri: item.image_uri }}
  style={styles.cardImage}
  resizeMode="cover"
/>
                <View style={styles.cardOverlay}>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {image.name || `Storage ${index + 1}`}
                    </Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        openEditModal(image, index);
                      }}
                      style={styles.editButton}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  {image.markerCount > 0 && (
                    <View style={styles.markerBadge}>
                      <MapPin size={12} color="#FFFFFF" />
                      <Text style={styles.markerCount}>{image.markerCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteImage(image, index)}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={selectedStorage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEditModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rename Storage</Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Storage Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter storage name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveStorageName}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    fontSize: 24,
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
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    position: 'relative',
  },
  card: {
    width: '100%',
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 59, 48, 0.2)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  editButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  markerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  markerCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, ChevronRight, Trash2, CreditCard as Edit2, X, Eye } from 'lucide-react-native';
import { supabase, type LocationMarker } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import SearchBar from '../../components/SearchBar';
import SearchResults from '../../components/SearchResults';
import { searchTools, type SearchResult } from '../../lib/searchTools';

interface LocationWithTools extends LocationMarker {
  toolCount: number;
}

export default function LocationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<LocationWithTools[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithTools | null>(null);
  const [editedName, setEditedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocations();
    }, [])
  );

  const loadLocations = async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      const { data: markers, error: markersError } = await supabase
        .from('location_markers')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (markersError) {
        console.error('Error loading markers:', markersError);
        setLocations([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const locationsWithTools = await Promise.all(
        (markers || []).map(async (marker) => {
          const { count } = await supabase
            .from('tools')
            .select('*', { count: 'exact', head: true })
            .eq('location_marker_id', marker.id)
            .eq('user_id', user?.id);

          return {
            ...marker,
            toolCount: count || 0,
          };
        })
      );

      setLocations(locationsWithTools);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);

      searchTimeoutRef.current = setTimeout(async () => {
        if (!user?.id) {
          setSearchLoading(false);
          return;
        }
        const results = await searchTools(query, user.id);
        setSearchResults(results);
        setSearchLoading(false);
      }, 300);
    },
    [user?.id]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchLoading(false);
    Keyboard.dismiss();
  }, []);

  const handleSearchResultPress = useCallback(
    async (result: SearchResult) => {
      clearSearch();

      const { data: storageImages, error } = await supabase
        .from('storage_images')
        .select('id')
        .eq('user_id', user?.id)
        .order('order_index', { ascending: true });

      if (error || !storageImages) {
        Alert.alert('Error', 'Could not navigate to tool location');
        return;
      }

      const imageIndex = storageImages.findIndex(
        (img) => img.id === result.storage_image_id
      );

      if (imageIndex === -1) {
        Alert.alert('Error', 'Storage image not found');
        return;
      }

      router.push({
        pathname: '/(tabs)/home',
        params: {
          scrollToIndex: imageIndex.toString(),
          highlightMarkerId: result.location_marker_id,
        },
      });
    },
    [user?.id, router, clearSearch]
  );

  const navigateToLocation = (markerId: string) => {
    router.push({
      pathname: '/details',
      params: { markerId },
    });
  };

  const navigateToStorageImage = async (location: LocationWithTools) => {
    try {
      const { data: storageImages, error } = await supabase
        .from('storage_images')
        .select('id')
        .eq('user_id', user?.id)
        .order('order_index', { ascending: true });

      if (error) {
        Alert.alert('Error', 'Could not find the storage image');
        return;
      }

      if (!storageImages || storageImages.length === 0) {
        Alert.alert('Error', 'No storage images found');
        return;
      }

      const imageIndex = storageImages.findIndex(
        (img) => img.id === location.storage_image_id
      );

      if (imageIndex === -1) {
        Alert.alert('Error', 'Storage image not found');
        return;
      }

      router.push({
        pathname: '/(tabs)/home',
        params: {
          scrollToIndex: imageIndex.toString(),
          highlightMarkerId: location.id,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Could not navigate to storage image');
    }
  };

  const openEditModal = (location: LocationWithTools) => {
    setSelectedLocation(location);
    setEditedName(location.name || `Location ${location.id.slice(-4)}`);
  };

  const closeEditModal = () => {
    setSelectedLocation(null);
    setEditedName('');
  };

  const saveLocationName = async () => {
    if (!selectedLocation) return;

    try {
      const { error } = await supabase
        .from('location_markers')
        .update({ name: editedName.trim() || null })
        .eq('id', selectedLocation.id);

      if (error) {
        Alert.alert('Error', 'Failed to save location name');
      } else {
        await loadLocations();
        closeEditModal();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save location name');
    }
  };

  const removeLocation = async (markerId: string) => {
    Alert.alert(
      'Remove Location',
      'Remove this location and all its tools?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(markerId);
            try {
              const { error: toolsError } = await supabase
                .from('tools')
                .delete()
                .eq('location_marker_id', markerId);

              if (toolsError) {
                Alert.alert('Error', 'Failed to remove tools. Location not deleted.');
                setDeletingId(null);
                return;
              }

              const { error: markerError } = await supabase
                .from('location_markers')
                .delete()
                .eq('id', markerId);

              if (markerError) {
                Alert.alert('Error', 'Failed to remove location');
              } else {
                await loadLocations();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove location');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const getLocationName = (location: LocationWithTools) => {
    return location.name || `Location ${location.id.slice(-4)}`;
  };

  const styles = createStyles(colors, isDark, insets);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading locations...</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={() => { clearSearch(); setIsSearchFocused(false); }}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={clearSearch}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search tools..."
        />
        {(searchQuery.length > 0 || isSearchFocused) && (
          <SearchResults
            results={searchResults}
            loading={searchLoading}
            query={searchQuery}
            onResultPress={handleSearchResultPress}
          />
        )}
      </View>
      {locations.length === 0 ? (
        <View style={styles.emptyState}>
          <MapPin size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>No locations yet</Text>
          <Text style={styles.emptySubtext}>
            Go to Home tab and tap on your storage images to add location markers
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {locations.map((location) => (
            <View key={location.id} style={styles.locationCard}>
              <TouchableOpacity
                style={styles.locationMain}
                onPress={() => navigateToLocation(location.id)}
                activeOpacity={0.7}
              >
                <View style={styles.locationIcon}>
                  <MapPin size={24} color={colors.accent} />
                </View>

                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>
                    {getLocationName(location)}
                  </Text>
                  <Text style={styles.toolCount}>
                    {location.toolCount} {location.toolCount === 1 ? 'tool' : 'tools'}
                  </Text>
                </View>

                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigateToStorageImage(location)}
                >
                  <Eye size={16} color={colors.success} />
                  <Text style={[styles.actionText, styles.viewText]}>View on Image</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.middleAction]}
                  onPress={() => openEditModal(location)}
                >
                  <Edit2 size={16} color={colors.accent} />
                  <Text style={styles.actionText}>Rename</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteAction]}
                  onPress={() => removeLocation(location.id)}
                  disabled={deletingId === location.id}
                >
                  {deletingId === location.id ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <Trash2 size={16} color={colors.error} />
                      <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={selectedLocation !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEditModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rename Location</Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Location Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter location name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveLocationName}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const createStyles = (colors: any, isDark: boolean, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  searchContainer: {
    paddingTop: insets.top + 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  locationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  toolCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  locationActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  middleAction: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  deleteAction: {
    borderLeftWidth: 0,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  viewText: {
    color: colors.success,
  },
  deleteText: {
    color: colors.error,
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

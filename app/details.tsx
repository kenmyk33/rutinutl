import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, CreditCard as Edit2, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { supabase, type Tool as DBTool } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { uploadImageToSupabase, type UploadOptions } from '../lib/uploadImageToSupabase';

export default function DetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { canAddTool, limits, refreshUsage } = useSubscription();
  const { markerId, storageImageId } = useLocalSearchParams<{ markerId?: string; storageImageId?: string }>();
  const [tools, setTools] = useState<DBTool[]>([]);
  const [newToolName, setNewToolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [selectedTool, setSelectedTool] = useState<DBTool | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [markerIds, setMarkerIds] = useState<string[]>([]);
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if ((markerId || storageImageId) && mounted) {
        await loadTools();
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [markerId, storageImageId]);

  const loadTools = async () => {
    try {
      setLoading(true);

      let targetMarkerIds: string[] = [];

      if (markerId) {
        targetMarkerIds = [markerId];

        const { data: markerData } = await supabase
          .from('location_markers')
          .select('name')
          .eq('id', markerId)
          .eq('user_id', user?.id)
          .single();

        setLocationName(markerData?.name || '');
      } else if (storageImageId) {
        const { data: markers, error: markerError } = await supabase
          .from('location_markers')
          .select('id')
          .eq('storage_image_id', storageImageId)
          .eq('user_id', user?.id);

        if (markerError) {
          Alert.alert('Error', 'Could not load location markers.');
          setLoading(false);
          return;
        }

        targetMarkerIds = markers?.map(m => m.id) || [];
      }

      setMarkerIds(targetMarkerIds);

      if (targetMarkerIds.length === 0) {
        setTools([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .in('location_marker_id', targetMarkerIds)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', 'Could not load tools.');
      } else {
        setTools(data || []);
      }
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadToolImage = async (uri: string): Promise<{ url: string; size: number } | null> => {
    try {
      if (!user?.id) {
        Alert.alert('Authentication Required', 'Please sign in to upload images.');
        return null;
      }

      const uploadOptions: UploadOptions = {
        fileName: `tool-${Date.now()}`,
        bucket: 'storage-images',
        compress: true,
        maxRetries: 3,
        userId: user.id,
      };

      const result = await uploadImageToSupabase(uri, uploadOptions);
      return { url: result.url, size: result.size };
    } catch (error) {
      return null;
    }
  };

  const pickImage = async () => {
    try {
      if (!newToolName.trim()) {
        Alert.alert('Error', 'Please enter a tool name first');
        return;
      }

      const targetMarkerId = markerId || markerIds[0];
      if (targetMarkerId && !canAddTool(targetMarkerId)) {
        Alert.alert(
          'Tool Limit Reached',
          `You've reached the maximum of ${limits.maxToolsPerLocation} tools per location on your current plan. Upgrade to add more.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/pricing') },
          ]
        );
        return;
      }

      setIsPickingImage(true);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to add tool images');
        setIsPickingImage(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        const uploadResult = await uploadToolImage(localUri);

        if (!uploadResult) {
          Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
          setIsPickingImage(false);
          return;
        }

        const targetMarkerId = markerId || markerIds[0];
        if (!targetMarkerId) {
          Alert.alert('Error', 'No location marker available.');
          setIsPickingImage(false);
          return;
        }

        const { data: newTool, error } = await supabase
          .from('tools')
          .insert({
            location_marker_id: targetMarkerId,
            name: newToolName.trim(),
            description: '',
            image_url: uploadResult.url,
            file_size: uploadResult.size,
            user_id: user?.id,
          })
          .select()
          .single();

        if (error) {
          Alert.alert('Error', 'Could not create tool.');
        } else {
          setTools([newTool, ...tools]);
          setNewToolName('');
          await refreshUsage();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsPickingImage(false);
    }
  };

  const addTool = async () => {
    if (newToolName.trim() === '') {
      Alert.alert('Error', 'Please enter a tool name');
      return;
    }

    const targetMarkerId = markerId || markerIds[0];
    if (!targetMarkerId) {
      Alert.alert('Error', 'No location marker available.');
      return;
    }

    if (!canAddTool(targetMarkerId)) {
      Alert.alert(
        'Tool Limit Reached',
        `You've reached the maximum of ${limits.maxToolsPerLocation} tools per location on your current plan. Upgrade to add more.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: () => router.push('/pricing') },
        ]
      );
      return;
    }

    try {
      const { data: newTool, error } = await supabase
        .from('tools')
        .insert({
          location_marker_id: targetMarkerId,
          name: newToolName.trim(),
          description: '',
          image_url: null,
          file_size: 0,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', 'Could not create tool.');
      } else {
        setTools([newTool, ...tools]);
        setNewToolName('');
        await refreshUsage();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add tool');
    }
  };

  const removeTool = (toolId: string) => {
    Alert.alert('Remove Tool', 'Are you sure you want to remove this tool?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('tools')
              .delete()
              .eq('id', toolId);

            if (error) {
              Alert.alert('Error', 'Could not remove tool.');
            } else {
              setTools(tools.filter((tool) => tool.id !== toolId));
            }
          } catch (error) {
            console.error('Error removing tool:', error);
          }
        },
      },
    ]);
  };

  const openToolModal = (tool: DBTool) => {
    setSelectedTool(tool);
    setEditedName(tool.name);
  };

  const closeToolModal = () => {
    setSelectedTool(null);
    setEditedName('');
    setIsEditingImage(false);
  };

  const changeToolImage = async () => {
    if (!selectedTool) return;

    try {
      setIsEditingImage(true);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos');
        setIsEditingImage(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        const uploadResult = await uploadToolImage(localUri);

        if (!uploadResult) {
          Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
          setIsEditingImage(false);
          return;
        }

        const { data: updatedTool, error } = await supabase
          .from('tools')
          .update({
            image_url: uploadResult.url,
            file_size: uploadResult.size
          })
          .eq('id', selectedTool.id)
          .select()
          .single();

        if (error) {
          Alert.alert('Error', 'Could not update tool image.');
        } else {
          setTools(tools.map((tool) => (tool.id === selectedTool.id ? updatedTool : tool)));
          setSelectedTool(updatedTool);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change image');
    } finally {
      setIsEditingImage(false);
    }
  };

  const removeToolImage = () => {
    if (!selectedTool) return;

    Alert.alert('Remove Image', 'Remove the image from this tool?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: updatedTool, error } = await supabase
              .from('tools')
              .update({
                image_url: null,
                file_size: 0
              })
              .eq('id', selectedTool.id)
              .select()
              .single();

            if (error) {
              Alert.alert('Error', 'Could not remove tool image.');
            } else {
              setTools(tools.map((tool) => (tool.id === selectedTool.id ? updatedTool : tool)));
              setSelectedTool(updatedTool);
            }
          } catch (error) {
            console.error('Error removing image:', error);
          }
        },
      },
    ]);
  };

  const saveToolEdit = async () => {
    if (!selectedTool) return;

    if (editedName.trim() === '') {
      Alert.alert('Error', 'Tool name cannot be empty');
      return;
    }

    try {
      const { data: updatedTool, error } = await supabase
        .from('tools')
        .update({ name: editedName.trim() })
        .eq('id', selectedTool.id)
        .select()
        .single();

      if (error) {
        Alert.alert('Error', 'Could not update tool.');
      } else {
        setTools(tools.map((tool) => (tool.id === selectedTool.id ? updatedTool : tool)));
        closeToolModal();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const updateLocationName = async () => {
    if (!markerId) return;

    try {
      const { error } = await supabase
        .from('location_markers')
        .update({ name: locationName.trim() || null })
        .eq('id', markerId);

      if (error) {
        Alert.alert('Error', 'Could not update location name.');
      }
    } catch (error) {
      console.error('Error updating location name:', error);
    }
  };

  const removeDot = async () => {
    Alert.alert('Remove Location', 'Remove this location and all its tools?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const targetMarkerIds = markerIds.length > 0 ? markerIds : (markerId ? [markerId] : []);

            if (targetMarkerIds.length === 0) {
              Alert.alert('Error', 'No location to remove.');
              return;
            }

            await supabase
              .from('tools')
              .delete()
              .in('location_marker_id', targetMarkerIds);

            const { error: markerError } = await supabase
              .from('location_markers')
              .delete()
              .in('id', targetMarkerIds);

            if (markerError) {
              Alert.alert('Error', 'Could not remove location.');
            } else {
              router.push({
                pathname: '/(tabs)/home',
                params: { reload: 'true' }
              });
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to remove location');
          }
        },
      },
    ]);
  };

  const styles = createStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(20, insets.bottom) }]}>
        <TextInput
          style={styles.title}
          value={locationName}
          onChangeText={setLocationName}
          onBlur={updateLocationName}
          placeholder="give name here"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter tool name"
            placeholderTextColor={colors.textMuted}
            value={newToolName}
            onChangeText={setNewToolName}
            onSubmitEditing={addTool}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, { minHeight: 48 }]}
            onPress={pickImage}
            disabled={isPickingImage}
          >
            {isPickingImage ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Camera color="#FFFFFF" size={20} />
                <Text style={styles.buttonText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {tools.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tools added yet</Text>
          </View>
        ) : (
          <View style={styles.toolsList}>
            {tools.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={styles.toolItem}
                onPress={() => openToolModal(tool)}
                activeOpacity={0.7}
              >
                <View style={styles.toolContent}>
                  {tool.image_url ? (
                    <Image
                      source={{ uri: tool.image_url }}
                      style={styles.toolImage}
                      cache="force-cache"
                    />
                  ) : (
                    <View style={styles.toolImagePlaceholder}>
                      <ImageIcon color={colors.textMuted} size={32} />
                    </View>
                  )}
                  <View style={styles.toolTextSection}>
                    <Text style={styles.toolName}>{tool.name}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeTool(tool.id);
                  }}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom) }]}>
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={removeDot}>
          <Text style={styles.buttonText}>Remove Location</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={selectedTool !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeToolModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeToolModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tool Details</Text>
              <TouchableOpacity onPress={closeToolModal} style={styles.closeButton}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {selectedTool && (
              <ScrollView style={styles.modalBody}>
                {selectedTool.image_url ? (
                  <View style={styles.modalImageContainer}>
                    <Image
                      source={{ uri: selectedTool.image_url }}
                      style={styles.modalImage}
                      cache="force-cache"
                    />
                    <View style={styles.imageActions}>
                      <TouchableOpacity
                        style={styles.imageActionButton}
                        onPress={changeToolImage}
                        disabled={isEditingImage}
                      >
                        {isEditingImage ? (
                          <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                          <>
                            <Edit2 color={colors.accent} size={18} />
                            <Text style={styles.imageActionText}>Change Image</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.imageActionButton, styles.removeImageButton]}
                        onPress={removeToolImage}
                      >
                        <Trash2 color={colors.error} size={18} />
                        <Text style={[styles.imageActionText, styles.removeImageText]}>Remove Image</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={changeToolImage}
                    disabled={isEditingImage}
                  >
                    {isEditingImage ? (
                      <ActivityIndicator size="large" color={colors.accent} />
                    ) : (
                      <>
                        <Camera color={colors.textMuted} size={48} />
                        <Text style={styles.addImageText}>Add Image</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <View style={styles.editSection}>
                  <Text style={styles.label}>Tool Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter tool name"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.metadataSection}>
                  <Text style={styles.metadataLabel}>Added on</Text>
                  <Text style={styles.metadataValue}>
                    {formatDate(selectedTool.created_at)}
                  </Text>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={saveToolEdit}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  toolImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    resizeMode: 'cover',
  },
  toolImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  toolsList: {
    gap: 12,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  toolTextSection: {
    flex: 1,
    justifyContent: 'center',
  },
  toolName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  removeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    width: '90%',
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalImageContainer: {
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  removeImageButton: {
    borderColor: colors.error,
  },
  imageActionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  removeImageText: {
    color: colors.error,
  },
  addImageButton: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addImageText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 12,
  },
  editSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
  metadataSection: {
    backgroundColor: colors.backgroundSecondary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  metadataLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, Database, MapPin, Image as ImageIcon, RefreshCw, UserX } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { deleteStorageImage } from '../lib/deleteImage';
import { deleteAccount } from '../lib/deleteAccount';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { emitDataCleared } from '../lib/refreshEvents';

interface StorageStats {
  imageCount: number;
  locations: number;
  totalTools: number;
  allImageIds: string[];
  allImageUris: string[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, session, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<StorageStats>({
    imageCount: 0,
    locations: 0,
    totalTools: 0,
    allImageIds: [],
    allImageUris: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (mounted && user?.id) {
        await loadStats();
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const loadStats = useCallback(async () => {
    if (loadingRef.current || !user?.id) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      const { data: storageImages } = await supabase
        .from('storage_images')
        .select('id, image_uri')
        .eq('user_id', user.id);

      const imageIds: string[] = [];
      const imageUris: string[] = [];
      let totalLocationCount = 0;
      let totalToolCount = 0;

      if (storageImages && storageImages.length > 0) {
        storageImages.forEach((img) => {
          imageIds.push(img.id);
          if (img.image_uri) {
            imageUris.push(img.image_uri);
          }
        });

        const { count: locCount } = await supabase
          .from('location_markers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        totalLocationCount = locCount || 0;

        if (totalLocationCount > 0) {
          const { data: markers } = await supabase
            .from('location_markers')
            .select('id')
            .eq('user_id', user.id);

          if (markers && markers.length > 0) {
            const markerIds = markers.map((m) => m.id);
            const { count: toolsCount } = await supabase
              .from('tools')
              .select('*', { count: 'exact', head: true })
              .in('location_marker_id', markerIds);

            totalToolCount = toolsCount || 0;
          }
        }
      }

      setStats({
        imageCount: storageImages?.length || 0,
        locations: totalLocationCount,
        totalTools: totalToolCount,
        allImageIds: imageIds,
        allImageUris: imageUris,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats, refreshing]);

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      `This will permanently delete ${stats.imageCount} image(s), ${stats.locations} location(s), and ${stats.totalTools} tool(s). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;

              const { data: markers } = await supabase
                .from('location_markers')
                .select('id')
                .eq('user_id', user.id);

              if (markers && markers.length > 0) {
                const markerIds = markers.map((m) => m.id);
                await supabase.from('tools').delete().in('location_marker_id', markerIds);
              }

              await supabase.from('location_markers').delete().eq('user_id', user.id);

              for (let i = 0; i < stats.allImageIds.length; i++) {
                const imageId = stats.allImageIds[i];
                const imageUri = stats.allImageUris[i];
                if (imageUri) {
                  await deleteStorageImage(imageId, imageUri);
                } else {
                  await supabase.from('storage_images').delete().eq('id', imageId);
                }
              }

              await loadStats();
              emitDataCleared();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear all data');
            }
          },
        },
      ]
    );
  };

  const clearLocations = () => {
    Alert.alert(
      'Clear All Locations',
      `Remove all ${stats.locations} location(s) and ${stats.totalTools} tool(s)? Your images will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;

              const { data: markers } = await supabase
                .from('location_markers')
                .select('id')
                .eq('user_id', user.id);

              if (markers && markers.length > 0) {
                const markerIds = markers.map((m) => m.id);
                await supabase.from('tools').delete().in('location_marker_id', markerIds);
              }

              await supabase.from('location_markers').delete().eq('user_id', user.id);

              await loadStats();
              emitDataCleared();
              Alert.alert('Success', 'All locations have been cleared');
            } catch (error) {
              console.error('Error clearing locations:', error);
              Alert.alert('Error', 'Failed to clear locations');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data including images, locations, tools, and subscription. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Type DELETE to confirm account deletion. You will not receive a refund for any active subscription.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    if (!session?.access_token) {
                      Alert.alert('Error', 'You must be signed in to delete your account');
                      return;
                    }

                    setDeleting(true);
                    try {
                      const result = await deleteAccount(session.access_token);

                      if (result.success) {
                        await signOut();
                        router.replace('/sign-in');
                      } else {
                        Alert.alert('Error', result.error || 'Failed to delete account');
                      }
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'An unexpected error occurred');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const styles = createStyles(colors, isDark);

  if (loading && !refreshing) {
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Storage Overview</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <RefreshCw size={18} color={colors.accent} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? '#3A3A2A' : '#FFF3E0' }]}>
                <ImageIcon size={20} color={colors.warning} />
              </View>
              <Text style={styles.statLabel}>Storage Images</Text>
              <Text style={styles.statValue}>{stats.imageCount}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: colors.accentLight }]}>
                <MapPin size={20} color={colors.accent} />
              </View>
              <Text style={styles.statLabel}>Locations</Text>
              <Text style={styles.statValue}>{stats.locations}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? '#2A3A2A' : '#E8F5E9' }]}>
                <Database size={20} color={colors.success} />
              </View>
              <Text style={styles.statLabel}>Total Tools</Text>
              <Text style={styles.statValue}>{stats.totalTools}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 4, marginBottom: 8 }]}>Data Management</Text>

          {stats.locations > 0 && (
            <TouchableOpacity style={styles.actionCard} onPress={clearLocations}>
              <View style={[styles.actionIcon, { backgroundColor: colors.accentLight }]}>
                <MapPin size={20} color={colors.accent} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Clear All Locations</Text>
                <Text style={styles.actionSubtitle}>
                  Remove {stats.locations} {stats.locations === 1 ? 'location' : 'locations'} and{' '}
                  {stats.totalTools} {stats.totalTools === 1 ? 'tool' : 'tools'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {(stats.imageCount > 0 || stats.locations > 0) && (
            <TouchableOpacity
              style={[styles.actionCard, styles.dangerCard]}
              onPress={clearAllData}
            >
              <View style={[styles.actionIcon, styles.dangerIcon]}>
                <Trash2 size={20} color={colors.error} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={[styles.actionTitle, styles.dangerText]}>Clear All Data</Text>
                <Text style={styles.actionSubtitle}>Permanently delete everything</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 4, marginBottom: 8 }]}>Account</Text>

          <TouchableOpacity
            style={[styles.actionCard, styles.deleteAccountCard]}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <View style={[styles.actionIcon, styles.deleteAccountIcon]}>
              {deleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <UserX size={20} color={colors.error} />
              )}
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, styles.dangerText]}>Delete Account</Text>
              <Text style={styles.actionSubtitle}>Permanently remove your account and data</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshButton: {
    padding: 8,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: colors.errorLight,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: colors.errorLight,
  },
  deleteAccountCard: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
  },
  deleteAccountIcon: {
    backgroundColor: colors.errorLight,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  dangerText: {
    color: colors.error,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

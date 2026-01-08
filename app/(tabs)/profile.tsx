import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { User, Settings, Info, Crown, MapPin, Database, ChevronRight, LogOut, HardDrive, Sun, Moon, CreditCard, AlertTriangle, Calendar, Shield, FileText } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getUserStorageUsage, formatBytes } from '@/lib/storageMonitoring';
import { backfillFileSizes } from '@/lib/backfillFileSizes';

interface StorageStats {
  locations: number;
  totalTools: number;
}

interface UserStorageInfo {
  fileCount: number;
  totalSizeBytes: number;
  totalSize: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, session, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { plan, limits, subscription, refreshSubscription } = useSubscription();
  const [stats, setStats] = useState<StorageStats>({
    locations: 0,
    totalTools: 0,
  });
  const [storageInfo, setStorageInfo] = useState<UserStorageInfo>({
    fileCount: 0,
    totalSizeBytes: 0,
    totalSize: '0 bytes',
  });
  const [loading, setLoading] = useState(true);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    loadStats();
    loadStorageInfo();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadStorageInfo();
      refreshSubscription();
    }, [user])
  );

  const loadStats = async () => {
    try {
      setLoading(true);

      const { count: locCount } = await supabase
        .from('location_markers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      const { count: toolsCount } = await supabase
        .from('tools')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setStats({
        locations: locCount || 0,
        totalTools: toolsCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    if (!user?.id) return;

    try {
      setLoadingStorage(true);

      const backfillResult = await backfillFileSizes(user.id);
      if (backfillResult.updated > 0) {
        console.log(`Backfilled ${backfillResult.updated} file sizes`);
      }
      if (backfillResult.errors.length > 0) {
        console.warn('Backfill errors:', backfillResult.errors);
      }

      const info = await getUserStorageUsage(user.id);
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/sign-in');
          },
        },
      ]
    );
  };

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id || !session?.access_token) {
      router.push('/pricing');
      return;
    }

    setLoadingPortal(true);

    try {
      const baseUrl = Platform.OS === 'web'
        ? window.location.origin
        : 'mytools://';

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: `${baseUrl}/profile`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      if (data.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
      }
    } catch (err: any) {
      console.error('Portal error:', err);
      Alert.alert('Error', err.message || 'Failed to open billing portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusInfo = () => {
    if (!subscription) return null;

    const status = subscription.status;
    if (status === 'past_due') {
      return { label: 'Payment Issue', color: colors.error, icon: AlertTriangle };
    }
    if (status === 'canceled' || subscription.canceled_at) {
      return { label: 'Canceling', color: colors.warning, icon: AlertTriangle };
    }
    return null;
  };

  const statusInfo = getStatusInfo();

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={40} color={colors.accent} />
            </View>
          </View>
          <Text style={styles.userName}>{user?.email || 'User'}</Text>
          <Text style={styles.userSubtitle}>Storage Manager</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>

          <View style={styles.subscriptionCard}>
            <TouchableOpacity
              style={styles.subscriptionHeader}
              onPress={() => router.push('/pricing')}
            >
              <View style={styles.subscriptionIcon}>
                <Crown size={24} color="#FFD700" />
              </View>
              <View style={styles.subscriptionInfo}>
                <View style={styles.subscriptionTitleRow}>
                  <Text style={styles.subscriptionTitle}>{plan.name} Plan</Text>
                  {statusInfo && (
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subscriptionSubtitle}>
                  {plan.id === 'free' ? 'Upgrade for more features' : 'View available plans'}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {subscription?.current_period_end && plan.id !== 'free' && (
              <View style={styles.subscriptionDetails}>
                <View style={styles.subscriptionDetailRow}>
                  <Calendar size={16} color={colors.textMuted} />
                  <Text style={styles.subscriptionDetailText}>
                    {subscription.canceled_at
                      ? `Access until ${formatDate(subscription.current_period_end)}`
                      : `Renews ${formatDate(subscription.current_period_end)}`}
                  </Text>
                </View>
              </View>
            )}

            {plan.id !== 'free' && subscription?.stripe_customer_id && (
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManageSubscription}
                disabled={loadingPortal}
              >
                {loadingPortal ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <CreditCard size={18} color={colors.accent} />
                    <Text style={styles.manageButtonText}>Manage Billing</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={styles.statIconWrapper}>
                <MapPin size={24} color={colors.accent} />
              </View>
              <Text style={styles.statNumber}>{stats.locations}</Text>
              <Text style={styles.statLabel}>Locations</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconWrapper}>
                <Database size={24} color={colors.success} />
              </View>
              <Text style={styles.statNumber}>{stats.totalTools}</Text>
              <Text style={styles.statLabel}>Tools</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>

          <View style={styles.storageCard}>
            <View style={styles.storageHeader}>
              <View style={styles.storageIconWrapper}>
                <HardDrive size={24} color={colors.accent} />
              </View>
              <View style={styles.storageTextContainer}>
                <Text style={styles.storageTitle}>Storage Used</Text>
                {loadingStorage ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Text style={styles.storageAmount}>{storageInfo.totalSize}</Text>
                )}
              </View>
            </View>
            <View style={styles.storageBar}>
              <View
                style={[
                  styles.storageBarFill,
                  {
                    width: `${Math.min((storageInfo.totalSizeBytes / limits.maxStorageBytes) * 100, 100)}%`,
                    backgroundColor: storageInfo.totalSizeBytes > limits.maxStorageBytes * 0.8 ? colors.error : colors.accent
                  }
                ]}
              />
            </View>
            <View style={styles.storageDetails}>
              <Text style={styles.storageDetailText}>
                {storageInfo.fileCount} {storageInfo.fileCount === 1 ? 'file' : 'files'}
              </Text>
              <Text style={styles.storageDetailText}>
                {limits.maxStorageBytes >= 1024 * 1024 * 1024
                  ? `${(limits.maxStorageBytes / (1024 * 1024 * 1024)).toFixed(0)} GB limit`
                  : `${(limits.maxStorageBytes / (1024 * 1024)).toFixed(0)} MB limit`}
              </Text>
            </View>
          </View>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.menuCard}>
            <View style={styles.menuIcon}>
              {isDark ? <Moon size={20} color={colors.accent} /> : <Sun size={20} color={colors.warning} />}
            </View>
            <Text style={styles.menuTitle}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/settings')}
          >
            <View style={styles.menuIcon}>
              <Settings size={20} color={colors.accent} />
            </View>
            <Text style={styles.menuTitle}>Data Management</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/about')}
          >
            <View style={styles.menuIcon}>
              <Info size={20} color={colors.textMuted} />
            </View>
            <Text style={styles.menuTitle}>About</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/privacy')}
          >
            <View style={styles.menuIcon}>
              <Shield size={20} color={colors.accent} />
            </View>
            <Text style={styles.menuTitle}>Privacy Policy</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/terms')}
          >
            <View style={styles.menuIcon}>
              <FileText size={20} color={colors.accent} />
            </View>
            <Text style={styles.menuTitle}>Terms of Service</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuCard, styles.signOutCard]}
            onPress={handleSignOut}
          >
            <View style={[styles.menuIcon, styles.signOutIcon]}>
              <LogOut size={20} color={colors.error} />
            </View>
            <Text style={[styles.menuTitle, styles.signOutText]}>Sign Out</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
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
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.card,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? '#3A3000' : '#FFF9E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  subscriptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  subscriptionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subscriptionDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subscriptionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionDetailText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  version: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  signOutCard: {
    borderWidth: 1,
    borderColor: colors.errorLight,
  },
  signOutIcon: {
    backgroundColor: colors.errorLight,
  },
  signOutText: {
    color: colors.error,
  },
  storageCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storageIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storageTextContainer: {
    flex: 1,
  },
  storageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  storageAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
  },
  storageBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  storageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageDetailText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

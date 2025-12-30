import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { PlanId, PlanLimits, PLAN_LIMITS, getPlanById, PlanInfo } from '@/lib/subscriptionLimits';
import {
  initializeAdapty,
  identifyUser,
  logoutAdapty,
  getProfile,
  parseSubscriptionInfo,
  getPaywallProducts,
  makePurchase,
  restorePurchases,
  isAdaptySupported,
  AdaptySubscriptionInfo,
} from '@/lib/adapty';
import type { AdaptyProduct } from 'react-native-adapty';

interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  billing_cycle: 'monthly' | 'yearly' | null;
  status: string;
  is_trial: boolean;
  adapty_profile_id: string | null;
  adapty_access_level: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UsageStats {
  imageCount: number;
  locationCounts: Record<string, number>;
  toolCounts: Record<string, number>;
  totalStorageBytes: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: PlanInfo;
  billingCycle: 'monthly' | 'yearly' | null;
  limits: PlanLimits;
  usage: UsageStats;
  loading: boolean;
  isTrial: boolean;
  adaptyProducts: AdaptyProduct[];
  productsLoading: boolean;
  purchaseInProgress: boolean;
  canAddImage: () => boolean;
  canAddLocation: (imageId: string) => boolean;
  canAddTool: (locationId: string) => boolean;
  getRemainingImages: () => number;
  getRemainingLocations: (imageId: string) => number;
  getRemainingTools: (locationId: string) => number;
  refreshUsage: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  loadProducts: () => Promise<void>;
  purchase: (product: AdaptyProduct) => Promise<{ success: boolean; error: string | null }>;
  restore: () => Promise<{ success: boolean; error: string | null }>;
  isNativePaymentSupported: boolean;
}

const defaultUsage: UsageStats = {
  imageCount: 0,
  locationCounts: {},
  toolCounts: {},
  totalStorageBytes: 0,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats>(defaultUsage);
  const [loading, setLoading] = useState(true);
  const [adaptyProducts, setAdaptyProducts] = useState<AdaptyProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [adaptyInitialized, setAdaptyInitialized] = useState(false);

  const plan = getPlanById(subscription?.plan_id || 'free');
  const limits = PLAN_LIMITS[subscription?.plan_id || 'free'];
  const isTrial = subscription?.is_trial || false;
  const isNativePaymentSupported = isAdaptySupported();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      initializeAdapty().then((initialized) => {
        setAdaptyInitialized(initialized);
      });
    }
  }, []);

  useEffect(() => {
    if (user?.id && adaptyInitialized) {
      identifyUser(user.id);
    } else if (!user?.id && adaptyInitialized) {
      logoutAdapty();
    }
  }, [user?.id, adaptyInitialized]);

  const syncAdaptyToSupabase = useCallback(async (adaptyInfo: AdaptySubscriptionInfo) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: user.id,
            plan_id: adaptyInfo.planId,
            billing_cycle: adaptyInfo.billingCycle,
            status: adaptyInfo.isTrial ? 'trialing' : (adaptyInfo.isActive ? 'active' : 'expired'),
            is_trial: adaptyInfo.isTrial,
            adapty_access_level: adaptyInfo.isPremium ? 'premium' : null,
            current_period_end: adaptyInfo.expiresAt?.toISOString() || null,
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error syncing Adapty to Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to sync Adapty to Supabase:', err);
    }
  }, [user?.id]);

  const loadFromAdapty = useCallback(async (): Promise<AdaptySubscriptionInfo | null> => {
    if (!adaptyInitialized || Platform.OS === 'web') return null;

    const profile = await getProfile();
    const subscriptionInfo = parseSubscriptionInfo(profile);

    if (subscriptionInfo.isActive) {
      await syncAdaptyToSupabase(subscriptionInfo);
    }

    return subscriptionInfo;
  }, [adaptyInitialized, syncAdaptyToSupabase]);

  const loadSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      if (adaptyInitialized && Platform.OS !== 'web') {
        await loadFromAdapty();
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
        setSubscription(null);
        setLoading(false);
        return;
      }

      if (data) {
        setSubscription(data as Subscription);
      } else {
        try {
          const { data: newSub, error: insertError } = await supabase
            .from('subscriptions')
            .insert({ user_id: user.id, plan_id: 'free', status: 'active', is_trial: false })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating subscription:', insertError);
            setSubscription(null);
          } else {
            setSubscription(newSub as Subscription);
          }
        } catch (insertErr) {
          console.error('Failed to create subscription:', insertErr);
          setSubscription(null);
        }
      }
    } catch (err) {
      console.error('Subscription load failed:', err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, adaptyInitialized, loadFromAdapty]);

  const loadUsage = useCallback(async () => {
    if (!user?.id) {
      setUsage(defaultUsage);
      return;
    }

    const { data: images } = await supabase
      .from('storage_images')
      .select('id, file_size')
      .eq('user_id', user.id);

    const imageCount = images?.length || 0;
    const totalStorageBytes = images?.reduce((sum, img) => sum + (img.file_size || 0), 0) || 0;

    const locationCounts: Record<string, number> = {};
    const toolCounts: Record<string, number> = {};

    if (images && images.length > 0) {
      const imageIds = images.map((img) => img.id);

      const { data: locations } = await supabase
        .from('location_markers')
        .select('id, storage_image_id')
        .in('storage_image_id', imageIds);

      if (locations) {
        for (const loc of locations) {
          const imgId = loc.storage_image_id;
          locationCounts[imgId] = (locationCounts[imgId] || 0) + 1;
        }

        const locationIds = locations.map((loc) => loc.id);

        if (locationIds.length > 0) {
          const { data: tools } = await supabase
            .from('tools')
            .select('id, location_marker_id, file_size')
            .in('location_marker_id', locationIds);

          if (tools) {
            for (const tool of tools) {
              const locId = tool.location_marker_id;
              toolCounts[locId] = (toolCounts[locId] || 0) + 1;
            }

            const toolStorageBytes = tools.reduce((sum, t) => sum + (t.file_size || 0), 0);
            setUsage({
              imageCount,
              locationCounts,
              toolCounts,
              totalStorageBytes: totalStorageBytes + toolStorageBytes,
            });
            return;
          }
        }
      }
    }

    setUsage({
      imageCount,
      locationCounts,
      toolCounts,
      totalStorageBytes,
    });
  }, [user?.id]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    if (user?.id) {
      loadUsage();
    }
  }, [user?.id, loadUsage]);

  const loadProducts = useCallback(async () => {
    if (!adaptyInitialized || Platform.OS === 'web') return;

    setProductsLoading(true);
    try {
      const products = await getPaywallProducts();
      setAdaptyProducts(products);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, [adaptyInitialized]);

  const purchase = useCallback(async (product: AdaptyProduct): Promise<{ success: boolean; error: string | null }> => {
    if (!adaptyInitialized) {
      return { success: false, error: 'Payment system not initialized' };
    }

    setPurchaseInProgress(true);
    try {
      const result = await makePurchase(product);

      if (result.success && result.profile) {
        const subscriptionInfo = parseSubscriptionInfo(result.profile);
        await syncAdaptyToSupabase(subscriptionInfo);
        await loadSubscription();
      }

      return { success: result.success, error: result.error };
    } finally {
      setPurchaseInProgress(false);
    }
  }, [adaptyInitialized, syncAdaptyToSupabase, loadSubscription]);

  const restore = useCallback(async (): Promise<{ success: boolean; error: string | null }> => {
    if (!adaptyInitialized) {
      return { success: false, error: 'Payment system not initialized' };
    }

    setPurchaseInProgress(true);
    try {
      const result = await restorePurchases();

      if (result.success && result.profile) {
        const subscriptionInfo = parseSubscriptionInfo(result.profile);
        await syncAdaptyToSupabase(subscriptionInfo);
        await loadSubscription();
      }

      return { success: result.success, error: result.error };
    } finally {
      setPurchaseInProgress(false);
    }
  }, [adaptyInitialized, syncAdaptyToSupabase, loadSubscription]);

  const canAddImage = useCallback(() => {
    if (limits.maxImages === -1) return true;
    return usage.imageCount < limits.maxImages;
  }, [usage.imageCount, limits.maxImages]);

  const canAddLocation = useCallback(
    (imageId: string) => {
      if (limits.maxLocationsPerImage === -1) return true;
      const currentCount = usage.locationCounts[imageId] || 0;
      return currentCount < limits.maxLocationsPerImage;
    },
    [usage.locationCounts, limits.maxLocationsPerImage]
  );

  const canAddTool = useCallback(
    (locationId: string) => {
      if (limits.maxToolsPerLocation === -1) return true;
      const currentCount = usage.toolCounts[locationId] || 0;
      return currentCount < limits.maxToolsPerLocation;
    },
    [usage.toolCounts, limits.maxToolsPerLocation]
  );

  const getRemainingImages = useCallback(() => {
    if (limits.maxImages === -1) return -1;
    return Math.max(0, limits.maxImages - usage.imageCount);
  }, [usage.imageCount, limits.maxImages]);

  const getRemainingLocations = useCallback(
    (imageId: string) => {
      if (limits.maxLocationsPerImage === -1) return -1;
      const currentCount = usage.locationCounts[imageId] || 0;
      return Math.max(0, limits.maxLocationsPerImage - currentCount);
    },
    [usage.locationCounts, limits.maxLocationsPerImage]
  );

  const getRemainingTools = useCallback(
    (locationId: string) => {
      if (limits.maxToolsPerLocation === -1) return -1;
      const currentCount = usage.toolCounts[locationId] || 0;
      return Math.max(0, limits.maxToolsPerLocation - currentCount);
    },
    [usage.toolCounts, limits.maxToolsPerLocation]
  );

  const refreshUsage = useCallback(async () => {
    await loadUsage();
  }, [loadUsage]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  const billingCycle = subscription?.billing_cycle || null;

  const value = {
    subscription,
    plan,
    billingCycle,
    limits,
    usage,
    loading,
    isTrial,
    adaptyProducts,
    productsLoading,
    purchaseInProgress,
    canAddImage,
    canAddLocation,
    canAddTool,
    getRemainingImages,
    getRemainingLocations,
    getRemainingTools,
    refreshUsage,
    refreshSubscription,
    loadProducts,
    purchase,
    restore,
    isNativePaymentSupported,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

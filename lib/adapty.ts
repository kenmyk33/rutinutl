import { Platform } from 'react-native';
import { adapty, AdaptyProfile, AdaptyPaywall, AdaptyProduct, AdaptyError } from 'react-native-adapty';
import { PlanId } from './subscriptionLimits';

const ADAPTY_API_KEY = process.env.EXPO_PUBLIC_ADAPTY_API_KEY || '';
const PAYWALL_PLACEMENT_ID = 'main_paywall';
const ACCESS_LEVEL_ID = 'premium';

export interface AdaptySubscriptionInfo {
  isActive: boolean;
  isPremium: boolean;
  planId: PlanId;
  billingCycle: 'monthly' | 'yearly' | null;
  isTrial: boolean;
  expiresAt: Date | null;
  willRenew: boolean;
}

export interface AdaptyProductInfo {
  productId: string;
  localizedPrice: string;
  price: number;
  currencyCode: string;
  planId: PlanId;
  billingCycle: 'monthly' | 'yearly';
}

let isInitialized = false;

export async function initializeAdapty(): Promise<boolean> {
  if (isInitialized) return true;
  if (Platform.OS === 'web') {
    console.log('Adapty: Web platform not supported, skipping initialization');
    return false;
  }
  if (!ADAPTY_API_KEY || ADAPTY_API_KEY === 'your_adapty_public_sdk_key') {
    console.warn('Adapty: API key not configured');
    return false;
  }

  try {
    await adapty.activate(ADAPTY_API_KEY, {
      logLevel: __DEV__ ? 'verbose' : 'error',
    });
    isInitialized = true;
    console.log('Adapty: Initialized successfully');
    return true;
  } catch (error) {
    console.error('Adapty: Initialization failed', error);
    return false;
  }
}

export async function identifyUser(userId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!isInitialized) {
    const initialized = await initializeAdapty();
    if (!initialized) return false;
  }

  try {
    await adapty.identify(userId);
    console.log('Adapty: User identified', userId);
    return true;
  } catch (error) {
    console.error('Adapty: Failed to identify user', error);
    return false;
  }
}

export async function logoutAdapty(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!isInitialized) return;

  try {
    await adapty.logout();
    console.log('Adapty: User logged out');
  } catch (error) {
    console.error('Adapty: Logout failed', error);
  }
}

export async function getProfile(): Promise<AdaptyProfile | null> {
  if (Platform.OS === 'web') return null;
  if (!isInitialized) return null;

  try {
    const profile = await adapty.getProfile();
    return profile;
  } catch (error) {
    console.error('Adapty: Failed to get profile', error);
    return null;
  }
}

export function parseSubscriptionInfo(profile: AdaptyProfile | null): AdaptySubscriptionInfo {
  const defaultInfo: AdaptySubscriptionInfo = {
    isActive: false,
    isPremium: false,
    planId: 'free',
    billingCycle: null,
    isTrial: false,
    expiresAt: null,
    willRenew: false,
  };

  if (!profile) return defaultInfo;

  const accessLevels = profile.accessLevels;
  if (!accessLevels) return defaultInfo;

  const premiumAccess = accessLevels[ACCESS_LEVEL_ID];
  if (!premiumAccess || !premiumAccess.isActive) return defaultInfo;

  const vendorProductId = premiumAccess.vendorProductId || '';
  const planId = getPlanFromProductId(vendorProductId);
  const billingCycle = getBillingCycleFromProductId(vendorProductId);

  return {
    isActive: premiumAccess.isActive,
    isPremium: true,
    planId,
    billingCycle,
    isTrial: premiumAccess.activatedIntroductory || false,
    expiresAt: premiumAccess.expiresAt ? new Date(premiumAccess.expiresAt) : null,
    willRenew: premiumAccess.willRenew || false,
  };
}

function getPlanFromProductId(productId: string): PlanId {
  if (productId.includes('premium')) return 'premium';
  if (productId.includes('pro')) return 'pro';
  return 'free';
}

function getBillingCycleFromProductId(productId: string): 'monthly' | 'yearly' | null {
  if (productId.includes('yearly') || productId.includes('annual')) return 'yearly';
  if (productId.includes('monthly')) return 'monthly';
  return null;
}

export async function getPaywall(): Promise<AdaptyPaywall | null> {
  if (Platform.OS === 'web') return null;
  if (!isInitialized) return null;

  try {
    const paywall = await adapty.getPaywall(PAYWALL_PLACEMENT_ID);
    return paywall;
  } catch (error) {
    console.error('Adapty: Failed to get paywall', error);
    return null;
  }
}

export async function getPaywallProducts(): Promise<AdaptyProduct[]> {
  if (Platform.OS === 'web') return [];
  if (!isInitialized) return [];

  try {
    const paywall = await getPaywall();
    if (!paywall) return [];

    const products = await adapty.getPaywallProducts(paywall);
    return products;
  } catch (error) {
    console.error('Adapty: Failed to get paywall products', error);
    return [];
  }
}

export function parseProductInfo(product: AdaptyProduct): AdaptyProductInfo {
  const productId = product.vendorProductId;
  const planId = getPlanFromProductId(productId);
  const billingCycle = getBillingCycleFromProductId(productId) || 'monthly';

  return {
    productId,
    localizedPrice: product.localizedPrice || '$0.00',
    price: product.price?.amount || 0,
    currencyCode: product.price?.currencyCode || 'USD',
    planId,
    billingCycle,
  };
}

export async function makePurchase(product: AdaptyProduct): Promise<{
  success: boolean;
  profile: AdaptyProfile | null;
  error: string | null;
}> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      profile: null,
      error: 'In-app purchases are not available on web',
    };
  }
  if (!isInitialized) {
    return {
      success: false,
      profile: null,
      error: 'Adapty not initialized',
    };
  }

  try {
    const result = await adapty.makePurchase(product);
    return {
      success: true,
      profile: result,
      error: null,
    };
  } catch (error) {
    const adaptyError = error as AdaptyError;
    if (adaptyError.adaptyCode === 2) {
      return {
        success: false,
        profile: null,
        error: 'Purchase cancelled',
      };
    }
    console.error('Adapty: Purchase failed', error);
    return {
      success: false,
      profile: null,
      error: adaptyError.message || 'Purchase failed',
    };
  }
}

export async function restorePurchases(): Promise<{
  success: boolean;
  profile: AdaptyProfile | null;
  error: string | null;
}> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      profile: null,
      error: 'Restore not available on web',
    };
  }
  if (!isInitialized) {
    return {
      success: false,
      profile: null,
      error: 'Adapty not initialized',
    };
  }

  try {
    const profile = await adapty.restorePurchases();
    const subscriptionInfo = parseSubscriptionInfo(profile);
    return {
      success: subscriptionInfo.isActive,
      profile,
      error: subscriptionInfo.isActive ? null : 'No active subscription found',
    };
  } catch (error) {
    console.error('Adapty: Restore failed', error);
    const adaptyError = error as AdaptyError;
    return {
      success: false,
      profile: null,
      error: adaptyError.message || 'Restore failed',
    };
  }
}

export function isAdaptySupported(): boolean {
  return Platform.OS !== 'web';
}

export function isAdaptyInitialized(): boolean {
  return isInitialized;
}

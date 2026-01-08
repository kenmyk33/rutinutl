export type PlanId = 'free' | 'pro' | 'premium';

export interface PlanLimits {
  maxImages: number;
  maxLocationsPerImage: number;
  maxToolsPerLocation: number;
  maxStorageBytes: number;
  maxFileSizeBytes: number;
}

export interface PlanInfo {
  id: PlanId;
  name: string;
  description: string;
  limits: PlanLimits;
  priceMonthly: number;
  priceYearly: number;
  adaptyProductIdMonthly?: string;
  adaptyProductIdYearly?: string;
  features: string[];
  highlighted?: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxImages: 3,
    maxLocationsPerImage: 4,
    maxToolsPerLocation: 10,
    maxStorageBytes: 50 * 1024 * 1024,
    maxFileSizeBytes: 5 * 1024 * 1024,
  },
  pro: {
    maxImages: 15,
    maxLocationsPerImage: 15,
    maxToolsPerLocation: 50,
    maxStorageBytes: 500 * 1024 * 1024,
    maxFileSizeBytes: 25 * 1024 * 1024,
  },
  premium: {
    maxImages: -1,
    maxLocationsPerImage: -1,
    maxToolsPerLocation: -1,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 100 * 1024 * 1024,
  },
};

export const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    limits: PLAN_LIMITS.free,
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '3 storage images',
      '4 locations per image',
      '10 tools per location',
      '50 MB total storage',
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    limits: PLAN_LIMITS.pro,
    priceMonthly: 4.99,
    priceYearly: 49.99,
    adaptyProductIdMonthly: 'pro_monthly',
    adaptyProductIdYearly: 'pro_yearly',
    highlighted: true,
    features: [
      '15 storage images',
      '15 locations per image',
      '50 tools per location',
      '500 MB total storage',
      'Priority support',
      '7-day free trial',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Unlimited everything',
    limits: PLAN_LIMITS.premium,
    priceMonthly: 9.99,
    priceYearly: 99.99,
    adaptyProductIdMonthly: 'premium_monthly',
    adaptyProductIdYearly: 'premium_yearly',
    features: [
      'Unlimited images',
      'Unlimited locations',
      'Unlimited tools',
      '5 GB total storage',
      'Priority support',
      'Early access to features',
      '7-day free trial',
    ],
  },
];

export function getPlanById(planId: PlanId): PlanInfo {
  return PLANS.find((p) => p.id === planId) || PLANS[0];
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function formatLimit(value: number): string {
  return isUnlimited(value) ? 'Unlimited' : value.toString();
}

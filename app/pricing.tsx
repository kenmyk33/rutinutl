import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Crown, Zap, Sparkles, CheckCircle, XCircle, RefreshCw, Gift } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { PLANS, PlanInfo, formatLimit } from '@/lib/subscriptionLimits';
import { parseProductInfo } from '@/lib/adapty';
import type { AdaptyPaywallProduct } from 'react-native-adapty';

export default function PricingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    plan: currentPlan,
    billingCycle: currentBillingCycle,
    isTrial,
    refreshSubscription,
    adaptyProducts,
    productsLoading,
    purchaseInProgress,
    loadProducts,
    purchase,
    restore,
    isNativePaymentSupported,
  } = useSubscription();
  const { session } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isNativePaymentSupported) {
      loadProducts();
    }
  }, [isNativePaymentSupported, loadProducts]);

  const styles = createStyles(colors, isDark);

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Crown size={28} color="#FFD700" />;
      case 'pro':
        return <Zap size={28} color="#007AFF" />;
      case 'premium':
        return <Sparkles size={28} color="#AF52DE" />;
      default:
        return <Crown size={28} color="#FFD700" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free':
        return '#FFD700';
      case 'pro':
        return '#007AFF';
      case 'premium':
        return '#AF52DE';
      default:
        return colors.accent;
    }
  };

   const getProductForPlan = (plan: PlanInfo): AdaptyPaywallProduct | null => {
    const targetProductId = billingCycle === 'monthly'
      ? plan.adaptyProductIdMonthly
      : plan.adaptyProductIdYearly;

    if (!targetProductId) return null;

    return adaptyProducts.find((p) => {
      const info = parseProductInfo(p);
      return info.planId === plan.id && info.billingCycle === billingCycle;
    }) || null;
  };

  const getProductPrice = (plan: PlanInfo): string => {
    const product = getProductForPlan(plan);
    if (product) {
      return product.price?.localizedString || `$${billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}`;
    }
    const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  };

  const handleSelectPlan = async (plan: PlanInfo) => {
    const isPlanMatch = plan.id === currentPlan.id;
    const isBillingMatch = plan.id === 'free' || billingCycle === currentBillingCycle;
    if (isPlanMatch && isBillingMatch) {
      return;
    }

    if (!session?.access_token) {
      Alert.alert('Sign In Required', 'Please sign in to upgrade your plan.');
      return;
    }

    if (plan.id === 'free') {
      Alert.alert(
        'Downgrade to Free',
        'To downgrade, please cancel your subscription from your device settings. Your current plan will remain active until the end of the billing period.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isNativePaymentSupported) {
      Alert.alert(
        'Mobile App Required',
        'In-app purchases are only available in the mobile app. Please download the app to subscribe.',
        [{ text: 'OK' }]
      );
      return;
    }

    const product = getProductForPlan(plan);
    if (!product) {
      Alert.alert(
        'Product Not Available',
        'This subscription product is not currently available. Please try again later.',
        [{ text: 'OK' }]
      );
      return;
    }

    setError(null);

    const result = await purchase(product);

    if (result.success) {
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000);
    } else if (result.error && result.error !== 'Purchase cancelled') {
      setError(result.error);
      Alert.alert('Purchase Failed', result.error);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isNativePaymentSupported) {
      Alert.alert('Not Available', 'Restore purchases is only available in the mobile app.');
      return;
    }

    setRestoring(true);
    setError(null);

    const result = await restore();

    setRestoring(false);

    if (result.success) {
      Alert.alert('Restored', 'Your purchases have been restored successfully.');
    } else {
      Alert.alert('Restore Failed', result.error || 'No active subscription found to restore.');
    }
  };

  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    try {
      await refreshSubscription();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefreshSubscription}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <RefreshCw size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {showSuccessBanner && (
        <View style={styles.successBanner}>
          <CheckCircle size={20} color="#FFFFFF" />
          <Text style={styles.bannerText}>
            {isTrial ? 'Free trial started! Enjoy your premium features.' : 'Subscription activated! Your plan is now active.'}
          </Text>
        </View>
      )}

      {isTrial && currentPlan.id !== 'free' && (
        <View style={styles.trialBanner}>
          <Gift size={18} color="#FFFFFF" />
          <Text style={styles.trialBannerText}>You&apos;re on a free trial</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {!isNativePaymentSupported && (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeText}>
              In-app purchases are only available in the mobile app. Download the app to subscribe.
            </Text>
          </View>
        )}

        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'monthly' && styles.billingOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'yearly' && styles.billingOptionTextActive,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 17%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {PLANS.map((plan) => {
          const isPlanMatch = plan.id === currentPlan.id;
          const isBillingMatch = plan.id === 'free' || billingCycle === currentBillingCycle;
          const isCurrentPlan = isPlanMatch && isBillingMatch;
          const planColor = getPlanColor(plan.id);
          const priceDisplay = getProductPrice(plan);
          const period = billingCycle === 'monthly' ? '/month' : '/year';
          const hasTrialFeature = plan.features.some(f => f.toLowerCase().includes('trial'));

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.highlighted && styles.planCardHighlighted,
                isCurrentPlan && styles.planCardCurrent,
              ]}
            >
              {plan.highlighted && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planIconContainer, { backgroundColor: planColor + '20' }]}>
                  {getPlanIcon(plan.id)}
                </View>
                <View style={styles.planTitleContainer}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {hasTrialFeature && plan.id !== 'free' && (
                      <View style={styles.trialBadge}>
                        <Gift size={12} color="#FFFFFF" />
                        <Text style={styles.trialBadgeText}>Free Trial</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.priceAmount}>{priceDisplay}</Text>
                {plan.priceMonthly > 0 && <Text style={styles.pricePeriod}>{period}</Text>}
              </View>

              <View style={styles.limitsContainer}>
                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>Images</Text>
                  <Text style={styles.limitValue}>{formatLimit(plan.limits.maxImages)}</Text>
                </View>
                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>Locations / Image</Text>
                  <Text style={styles.limitValue}>
                    {formatLimit(plan.limits.maxLocationsPerImage)}
                  </Text>
                </View>
                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>Tools / Location</Text>
                  <Text style={styles.limitValue}>
                    {formatLimit(plan.limits.maxToolsPerLocation)}
                  </Text>
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Check size={16} color={colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isCurrentPlan && styles.selectButtonCurrent,
                  { backgroundColor: isCurrentPlan ? colors.border : planColor },
                ]}
                onPress={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || purchaseInProgress || (plan.id !== 'free' && productsLoading)}
              >
                {purchaseInProgress || (plan.id !== 'free' && productsLoading) ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.selectButtonText,
                      isCurrentPlan && styles.selectButtonTextCurrent,
                    ]}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {isNativePaymentSupported && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          {Platform.OS === 'web'
            ? 'Download the mobile app to subscribe and manage your plan.'
            : 'Payment will be charged to your App Store or Google Play account. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    billingToggle: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
    },
    billingOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    billingOptionActive: {
      backgroundColor: colors.accent,
    },
    billingOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textMuted,
    },
    billingOptionTextActive: {
      color: '#FFFFFF',
    },
    saveBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    saveBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    planCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 8,
      elevation: isDark ? 0 : 3,
    },
    planCardHighlighted: {
      borderColor: '#007AFF',
    },
    planCardCurrent: {
      borderColor: colors.success,
    },
    popularBadge: {
      position: 'absolute',
      top: -12,
      right: 16,
      backgroundColor: '#007AFF',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    popularBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    planIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    planTitleContainer: {
      flex: 1,
    },
    planNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    planName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    planDescription: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    trialBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.success,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    trialBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    priceAmount: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.text,
    },
    pricePeriod: {
      fontSize: 16,
      color: colors.textMuted,
      marginLeft: 4,
    },
    limitsContainer: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
    },
    limitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    limitLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    limitValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    featuresContainer: {
      marginBottom: 20,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    featureText: {
      fontSize: 14,
      color: colors.text,
    },
    selectButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    selectButtonCurrent: {
      backgroundColor: colors.border,
    },
    selectButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    selectButtonTextCurrent: {
      color: colors.textMuted,
    },
    restoreButton: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    restoreButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
    },
    disclaimer: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 18,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.success,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    bannerText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    trialBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#007AFF',
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    trialBannerText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    webNotice: {
      backgroundColor: colors.warning + '20',
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    webNoticeText: {
      fontSize: 13,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

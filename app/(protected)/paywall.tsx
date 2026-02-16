import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PurchasesPackage } from '../../lib/purchases';
import { hapticSuccess, hapticMedium, hapticSelection } from '../../lib/haptics';
import { analyticsEvents, trackEvent } from '../../lib/analytics';

const MOCK_PACKAGES = [
  {
    id: 'weekly',
    title: 'Weekly',
    description: 'Billed every week',
    price: '$4.99',
    period: '/week',
    perDay: '$0.71/day',
    badge: null,
    savings: null,
  },
  {
    id: 'monthly',
    title: 'Monthly',
    description: 'Billed every month',
    price: '$9.99',
    period: '/month',
    perDay: '$0.33/day',
    badge: 'Popular',
    savings: 'Save 50%',
  },
  {
    id: 'annual',
    title: 'Annual',
    description: 'Billed once a year',
    price: '$39.99',
    period: '/year',
    perDay: '$0.11/day',
    badge: 'Best Value',
    savings: 'Save 85%',
  },
];

const FEATURES = [
  { icon: 'infinite', text: 'Unlimited daily responses', color: '#ec4899' },
  { icon: 'sparkles', text: 'All tones & categories', color: '#a855f7' },
  { icon: 'flash', text: 'Priority AI generation', color: '#f59e0b' },
  { icon: 'analytics', text: 'Advanced stats & insights', color: '#6366f1' },
  { icon: 'shield-checkmark', text: 'Ad-free experience', color: '#22c55e' },
];

export default function PaywallScreen() {
  const { offerings, isLoading, handlePurchase, handleRestore } = useSubscription();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedMock, setSelectedMock] = useState('annual');

  const hasRealPackages = offerings && offerings.availablePackages.length > 0;
  const selectedMockPackage = MOCK_PACKAGES.find((pkg) => pkg.id === selectedMock) || MOCK_PACKAGES[0];

  useEffect(() => {
    trackEvent(analyticsEvents.paywallViewed, {
      source: 'paywall_screen',
      real_packages: hasRealPackages,
      package_count: offerings?.availablePackages.length || MOCK_PACKAGES.length,
    });
  }, [hasRealPackages, offerings?.availablePackages.length]);

  const handlePackagePurchase = async (pkg: PurchasesPackage) => {
    trackEvent(analyticsEvents.paywallPurchaseTapped, {
      package_id: pkg.identifier,
      source: 'real_package_row',
    });
    setPurchasing(pkg.identifier);
    try {
      const success = await handlePurchase(pkg);
      if (success) {
        hapticSuccess();
        trackEvent(analyticsEvents.paywallPurchaseSucceeded, {
          package_id: pkg.identifier,
        });
        Alert.alert('Success', 'Subscription activated!');
        router.back();
      } else {
        trackEvent(analyticsEvents.paywallPurchaseFailed, {
          package_id: pkg.identifier,
        });
        Alert.alert('Error', 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleMockPurchase = () => {
    trackEvent(analyticsEvents.paywallPurchaseTapped, {
      package_id: selectedMockPackage.id,
      source: 'mock_cta',
    });
    Alert.alert(
      'RevenueCat Not Configured',
      `Selected plan: ${selectedMockPackage.title} (${selectedMockPackage.price}${selectedMockPackage.period}).\\n\\nIn-app purchases require a RevenueCat API key and an EAS dev build. Add EXPO_PUBLIC_REVENUECAT_KEY to your .env file.`
    );
  };

  const handleRestorePurchases = async () => {
    hapticMedium();
    trackEvent(analyticsEvents.paywallRestoreTapped, { source: 'paywall_screen' });
    const success = await handleRestore();
    if (success) {
      hapticSuccess();
      trackEvent(analyticsEvents.paywallRestoreSucceeded);
      Alert.alert('Success', 'Purchases restored!');
      router.back();
    } else {
      trackEvent(analyticsEvents.paywallRestoreFailed);
      Alert.alert('Not Found', 'No previous purchases found.');
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#0a0a14', '#1e1e2e', '#2d1b3d']} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ec4899" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a0a14', '#12121f', '#1a1a2e']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Close button */}
          <View className="flex-row justify-end px-5 pt-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/5"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View className="items-center px-6 pb-6 pt-2">
            <LinearGradient
              colors={['#ec4899', '#a855f7']}
              style={{
                width: 88,
                height: 88,
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#ec4899',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
              }}
            >
              <Text style={{ fontSize: 40 }}>✨</Text>
            </LinearGradient>
            <Text className="mb-2 mt-5 text-3xl font-bold text-white">Go Premium</Text>
            <Text className="text-center text-base leading-6 text-gray-400">
              Unlock your full potential{'\n'}with unlimited AI responses
            </Text>
          </View>

          {/* Features */}
          <View
            className="mx-5 mb-6 overflow-hidden rounded-3xl border border-white/[0.06]"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            {FEATURES.map((f, i) => (
              <View
                key={i}
                className={`flex-row items-center px-5 py-4 ${i < FEATURES.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
              >
                <View
                  className="mr-4 h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: f.color + '15' }}
                >
                  <Ionicons name={f.icon as any} size={20} color={f.color} />
                </View>
                <Text className="text-base font-medium text-gray-300">{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Social proof */}
          <View className="mx-5 mb-6 flex-row items-center justify-center">
            <View className="flex-row">
              {[...Array(5)].map((_, i) => (
                <Ionicons key={i} name="star" size={16} color="#f59e0b" />
              ))}
            </View>
            <Text className="ml-2 text-sm text-gray-400">Loved by 10K+ users</Text>
          </View>

          {/* Packages */}
          {hasRealPackages ? (
            offerings.availablePackages.map((pkg: PurchasesPackage) => (
              <TouchableOpacity
                key={pkg.identifier}
                className="mx-5 mb-3 overflow-hidden rounded-3xl border border-white/[0.06]"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                onPress={() => handlePackagePurchase(pkg)}
                disabled={purchasing === pkg.identifier}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center p-5">
                  <View className="flex-1">
                    <Text className="mb-1 text-lg font-bold text-white">
                      {pkg.product.title}
                    </Text>
                    <Text className="text-sm text-gray-500">{pkg.product.description}</Text>
                  </View>
                  <Text className="text-2xl font-bold text-primary-400">
                    {pkg.product.priceString}
                  </Text>
                  {purchasing === pkg.identifier && (
                    <ActivityIndicator color="#ec4899" style={{ marginLeft: 12 }} />
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            MOCK_PACKAGES.map((pkg) => {
              const isSelected = selectedMock === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  className="mx-5 mb-3"
                  onPress={() => {
                    hapticSelection();
                    setSelectedMock(pkg.id);
                  }}
                  activeOpacity={0.8}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#ec4899', '#a855f7']}
                      style={{ borderRadius: 24, padding: 1.5 }}
                    >
                      <View className="rounded-[22px] bg-[#12121f] p-5">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Text className="text-lg font-bold text-white">{pkg.title}</Text>
                              {pkg.badge && (
                                <LinearGradient
                                  colors={['#ec4899', '#a855f7']}
                                  style={{
                                    borderRadius: 8,
                                    marginLeft: 8,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text className="text-xs font-bold text-white">
                                    {pkg.badge}
                                  </Text>
                                </LinearGradient>
                              )}
                            </View>
                            <Text className="mt-1 text-sm text-gray-400">
                              {pkg.description}
                            </Text>
                            {pkg.savings && (
                              <Text className="mt-1 text-xs font-semibold text-green-400">
                                {pkg.savings}
                              </Text>
                            )}
                          </View>
                          <View className="items-end">
                            <Text className="text-2xl font-bold text-white">{pkg.price}</Text>
                            <Text className="text-xs text-gray-500">{pkg.period}</Text>
                            <Text className="mt-1 text-xs text-gray-600">{pkg.perDay}</Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View
                      className="rounded-3xl border border-white/[0.06] p-5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-lg font-bold text-gray-300">{pkg.title}</Text>
                            {pkg.badge && (
                              <View className="ml-2 rounded-lg bg-white/5 px-2 py-0.5">
                                <Text className="text-xs font-semibold text-gray-500">
                                  {pkg.badge}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text className="mt-1 text-sm text-gray-600">{pkg.description}</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-2xl font-bold text-gray-400">{pkg.price}</Text>
                          <Text className="text-xs text-gray-600">{pkg.period}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* CTA */}
          <View className="mx-5 mt-3">
            <TouchableOpacity
              onPress={hasRealPackages ? undefined : handleMockPurchase}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#ec4899', '#a855f7', '#6366f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 20,
                  paddingVertical: 18,
                  shadowColor: '#ec4899',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                }}
              >
                <Text className="text-center text-lg font-bold text-white">
                  {hasRealPackages
                    ? 'Choose a plan above to continue'
                    : `Continue with ${selectedMockPackage.title}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text className="mt-2 text-center text-xs text-gray-600">
              {hasRealPackages
                ? '3-day free trial, then auto-renews'
                : `${selectedMockPackage.price}${selectedMockPackage.period}, cancel anytime`}
            </Text>
          </View>

          {/* Restore */}
          <TouchableOpacity
            className="mx-5 mt-4 items-center p-3"
            onPress={handleRestorePurchases}
          >
            <Text className="text-sm font-medium text-gray-500">Restore Purchases</Text>
          </TouchableOpacity>

          <Text className="mx-6 mb-8 mt-2 text-center text-xs leading-5 text-gray-700">
            Payment will be charged to your Apple ID account at confirmation of purchase.
            Subscription automatically renews unless canceled at least 24 hours before the
            end of the current period. Cancel anytime in Settings {'>'} Apple ID.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { getOfferings, purchasePackage } from '../../lib/purchases';

// RevenueCat UI — paywall is fully managed from RevenueCat dashboard
let RevenueCatUI: any = null;
let PAYWALL_RESULT: any = { PURCHASED: 'PURCHASED', RESTORED: 'RESTORED', NOT_PRESENTED: 'NOT_PRESENTED', ERROR: 'ERROR', CANCELLED: 'CANCELLED' };
try {
  const mod = require('react-native-purchases-ui');
  RevenueCatUI = mod.default ?? mod;
  if (mod.PAYWALL_RESULT) PAYWALL_RESULT = mod.PAYWALL_RESULT;
} catch {
  // react-native-purchases-ui not available (Expo Go / dev)
}

interface Package {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
}

function FallbackPaywall({ onPurchaseCompleted }: { onPurchaseCompleted: () => Promise<void> }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();
      if (offerings?.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (err) {
      setError('Unable to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: Package) => {
    setPurchasing(pkg.identifier);
    setError(null);
    try {
      const result = await purchasePackage(pkg);
      if (result) {
        await onPurchaseCompleted();
      }
    } catch (err) {
      setError('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (pkg: Package) => {
    return pkg.product.priceString || `$${(pkg.product.price / 100).toFixed(2)}`;
  };

  const getPackageTitle = (pkg: Package) => {
    switch (pkg.packageType) {
      case 'ANNUAL':
        return 'Yearly';
      case 'MONTHLY':
        return 'Monthly';
      case 'WEEKLY':
        return 'Weekly';
      case 'LIFETIME':
        return 'Lifetime';
      default:
        return pkg.product.title || pkg.identifier;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          Upgrade to Premium
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 16, textAlign: 'center', marginBottom: 32 }}>
          Unlock unlimited access to all features
        </Text>

        {error && (
          <View style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: '#dc2626', textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        {packages.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ color: '#9ca3af', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
              No subscription options available
            </Text>
            <TouchableOpacity
              onPress={loadOfferings}
              style={{
                backgroundColor: '#3b82f6',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              onPress={() => handlePurchase(pkg)}
              disabled={purchasing !== null}
              style={{
                backgroundColor: purchasing ? '#374151' : '#3b82f6',
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                marginBottom: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: purchasing !== null && purchasing !== pkg.identifier ? 0.5 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
                {getPackageTitle(pkg)}
              </Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {formatPrice(pkg)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <TouchableOpacity
          onPress={router.back}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaywallScreen() {
  const { checkSubscription } = useSubscription();

  const handleDismiss = () => router.back();

  const handlePurchaseCompleted = async () => {
    await checkSubscription();
    router.back();
  };

  if (!RevenueCatUI) {
    return <FallbackPaywall onPurchaseCompleted={handlePurchaseCompleted} />;
  }

  return (
    <RevenueCatUI.Paywall
      onDismiss={handleDismiss}
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handlePurchaseCompleted}
      onPurchaseError={() => router.back()}
      onRestoreError={() => router.back()}
    />
  );
}
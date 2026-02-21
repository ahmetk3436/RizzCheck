import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getHasSeenOnboarding } from '../lib/settings';

export default function Index() {
  const { isAuthenticated, isGuest, isLoading: authLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getHasSeenOnboarding().then(setHasSeenOnboarding);
  }, []);

  if (authLoading || hasSeenOnboarding === null) {
    return (
      <LinearGradient colors={['#0a0a14', '#1e1e2e', '#2d1b3d']} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center">
          <LinearGradient
            colors={['#ec4899', '#a855f7']}
            style={{ width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 36 }}>💬</Text>
          </LinearGradient>
          <Text className="mt-4 text-2xl font-bold text-white">RizzCheck</Text>
          <ActivityIndicator size="large" color="#ec4899" style={{ marginTop: 20 }} />
        </View>
      </LinearGradient>
    );
  }

  if (isAuthenticated || isGuest) {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/(auth)/login" />;
}

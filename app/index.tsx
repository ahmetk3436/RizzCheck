import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@onboarding_complete').then((val) => {
      setOnboardingComplete(val === 'true');
    });
  }, []);

  if (isLoading || onboardingComplete === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a14' }}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  if (!onboardingComplete) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

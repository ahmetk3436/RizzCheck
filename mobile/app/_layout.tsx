import '../global.css';
import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { initHaptics } from '../lib/haptics';

export default function RootLayout() {
  useEffect(() => {
    initHaptics();
  }, []);

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <StatusBar style="light" />
        <Slot />
      </SubscriptionProvider>
    </AuthProvider>
  );
}

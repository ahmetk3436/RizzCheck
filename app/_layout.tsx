import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import '../lib/i18n';
import { initLanguage } from '../lib/i18n';
import { refreshApiBaseUrl } from '../lib/api';

export default function RootLayout() {
  useEffect(() => {
    refreshApiBaseUrl(); // Update API URL from remote config (non-blocking)
    initLanguage();
  }, []);

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </SubscriptionProvider>
    </AuthProvider>
  );
}

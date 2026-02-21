import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Redirect, Slot, usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { hapticSelection } from '../../lib/haptics';

const TABS = [
  { name: '(tabs)', icon: 'chatbubble', label: 'Rizz', href: '/(protected)/(tabs)' },
  { name: '(tabs)/profile', icon: 'person', label: 'Profile', href: '/(protected)/(tabs)/profile' },
];

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a14' }}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Hide tab bar on paywall and settings
  const showTabBar = !pathname.includes('paywall') && !pathname.includes('settings');

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a14' }}>
      <Slot />
      {showTabBar && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#0f0f1a',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.04)',
            paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 8),
            paddingTop: 10,
          }}
        >
          {TABS.map((tab) => {
            const isActive = tab.name === '(tabs)/profile'
              ? pathname.includes('profile')
              : !pathname.includes('profile') && !pathname.includes('paywall') && !pathname.includes('settings');
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => {
                  hapticSelection();
                  router.push(tab.href as any);
                }}
                style={{ flex: 1, alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(isActive ? tab.icon : tab.icon + '-outline') as any}
                  size={24}
                  color={isActive ? '#ec4899' : '#4b5563'}
                />
                <Text style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#ec4899' : '#4b5563',
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

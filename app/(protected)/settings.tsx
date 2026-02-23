import React, { useState, useEffect } from 'react';
import SupportTicketModal from '../../components/ui/SupportTicketModal';
import {
  View,
  Text,
  Pressable,
  Alert,
  Switch,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { isBiometricAvailable, getBiometricType } from '../../lib/biometrics';
import { hapticWarning, hapticMedium, hapticSelection, setHapticEnabledCache, getHapticEnabledCache } from '../../lib/haptics';
import {
  getHapticEnabled,
  setHapticEnabled as persistHaptic,
  getBiometricEnabled,
  setBiometricEnabled as persistBiometric,
  getNotificationsEnabled,
  setNotificationsEnabled as persistNotifications,
} from '../../lib/settings';
import { analyticsEvents, trackEvent } from '../../lib/analytics';
import { shareAppInvite } from '../../lib/share';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

const APP_STORE_URL = 'https://apps.apple.com/app/rizzcheck/id0000000000';
const PRIVACY_URL = 'https://rizzcheck.app/privacy';
const TERMS_URL = 'https://rizzcheck.app/terms';
const SUPPORT_EMAIL = 'support@rizzcheck.app';

export default function SettingsScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const { handleRestore } = useSubscription();
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [haptic, biometric, notifications] = await Promise.all([
      getHapticEnabled(),
      getBiometricEnabled(),
      getNotificationsEnabled(),
    ]);
    setHapticEnabled(haptic);
    setBiometricEnabled(biometric);
    setNotificationsEnabled(notifications);

    const available = await isBiometricAvailable();
    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
  };

  const toggleHaptic = async (value: boolean) => {
    setHapticEnabled(value);
    setHapticEnabledCache(value);
    await persistHaptic(value);
  };

  const toggleBiometric = async (value: boolean) => {
    setBiometricEnabled(value);
    await persistBiometric(value);
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await persistNotifications(value);
    if (!value) {
      Alert.alert(
        'Notifications Disabled',
        'To fully disable notifications, go to Settings > RizzCheck > Notifications.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    hapticWarning();
    Alert.alert(
      'Delete Account',
      'This action is permanent. All your data will be erased and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => setShowDeleteModal(true) },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    hapticMedium();
    trackEvent(analyticsEvents.paywallRestoreTapped, { source: 'settings' });
    const success = await handleRestore();
    if (success) {
      trackEvent(analyticsEvents.paywallRestoreSucceeded, { source: 'settings' });
      Alert.alert('Success', 'Purchases restored!');
      return;
    }
    trackEvent(analyticsEvents.paywallRestoreFailed, { source: 'settings' });
    Alert.alert('Not Found', 'No previous purchases found.');
  };

  const handleLogout = () => {
    hapticSelection();
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleRateApp = async () => {
    hapticSelection();
    const canRate = await StoreReview.isAvailableAsync();
    if (canRate) {
      await StoreReview.requestReview();
    } else {
      Linking.openURL(APP_STORE_URL);
    }
  };

  const handleShare = async () => {
    hapticSelection();
    trackEvent(analyticsEvents.shareAppTapped, { source: 'settings' });
    try {
      const shared = await shareAppInvite(APP_STORE_URL);
      if (shared) {
        trackEvent(analyticsEvents.shareAppCompleted, { source: 'settings' });
      }
    } catch {}
  };

  const handleSupport = () => {
    hapticSelection();
    setShowSupport(true);
  };

  return (
    <LinearGradient colors={['#0a0a14', '#1e1e2e', '#2d1b3d']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View className="flex-row items-center px-5 pb-2 pt-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-white/5"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#9ca3af" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white">Settings</Text>
          </View>

          <View className="px-5 pt-4">
            {/* Account */}
            <SectionHeader title="Account" />
            <View className="mb-5 overflow-hidden rounded-3xl border border-white/[0.06]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <View className="flex-row items-center p-5">
                <LinearGradient
                  colors={['#ec4899', '#a855f7']}
                  style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text className="text-lg font-bold text-white">
                    {user?.email?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View className="ml-4 flex-1">
                  <Text className="text-base font-medium text-white">{user?.email}</Text>
                  <Text className="mt-0.5 text-xs text-gray-500">Manage your account</Text>
                </View>
              </View>
            </View>

            {/* Preferences */}
            <SectionHeader title="Preferences" />
            <View className="mb-5 overflow-hidden rounded-3xl border border-white/[0.06]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              {biometricType && (
                <SettingRow
                  icon="finger-print"
                  iconColor="#a855f7"
                  label={biometricType}
                  subtitle={`Unlock with ${biometricType}`}
                  right={
                    <Switch
                      value={biometricEnabled}
                      onValueChange={toggleBiometric}
                      trackColor={{ false: '#374151', true: '#ec4899' }}
                      thumbColor="#fff"
                    />
                  }
                />
              )}
              <SettingRow
                icon="notifications-outline"
                iconColor="#f59e0b"
                label="Notifications"
                subtitle="Push notifications"
                right={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={toggleNotifications}
                    trackColor={{ false: '#374151', true: '#ec4899' }}
                    thumbColor="#fff"
                  />
                }
              />
              <SettingRow
                icon="phone-portrait-outline"
                iconColor="#22c55e"
                label="Haptic Feedback"
                subtitle="Vibration on interactions"
                right={
                  <Switch
                    value={hapticEnabled}
                    onValueChange={toggleHaptic}
                    trackColor={{ false: '#374151', true: '#ec4899' }}
                    thumbColor="#fff"
                  />
                }
                last
              />
            </View>

            {/* Subscription */}
            <SectionHeader title="Subscription" />
            <View className="mb-5 overflow-hidden rounded-3xl border border-white/[0.06]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <SettingRow
                icon="diamond-outline"
                iconColor="#ec4899"
                label="Upgrade to Pro"
                subtitle="Unlimited responses & features"
                onPress={() => { hapticSelection(); router.push('/(protected)/paywall'); }}
                showChevron
              />
              <SettingRow
                icon="refresh-outline"
                iconColor="#6366f1"
                label="Restore Purchases"
                subtitle="Recover previous subscriptions"
                onPress={handleRestorePurchases}
                showChevron
                last
              />
            </View>

            {/* Support */}
            <SectionHeader title="Support" />
            <View className="mb-5 overflow-hidden rounded-3xl border border-white/[0.06]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <SettingRow
                icon="help-circle-outline"
                iconColor="#3b82f6"
                label="Help Center"
                subtitle="Get help via email"
                onPress={handleSupport}
                showChevron
              />
              <SettingRow
                icon="document-text-outline"
                iconColor="#8b5cf6"
                label="Privacy Policy"
                onPress={() => { hapticSelection(); Linking.openURL(PRIVACY_URL); }}
                showChevron
              />
              <SettingRow
                icon="shield-outline"
                iconColor="#06b6d4"
                label="Terms of Service"
                onPress={() => { hapticSelection(); Linking.openURL(TERMS_URL); }}
                showChevron
              />
              <SettingRow
                icon="share-outline"
                iconColor="#22c55e"
                label="Share RizzCheck"
                subtitle="Tell your friends"
                onPress={handleShare}
                showChevron
                last
              />
            </View>

            {/* App Info */}
            <SectionHeader title="App" />
            <View className="mb-5 overflow-hidden rounded-3xl border border-white/[0.06]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <View className="flex-row items-center justify-between border-b border-white/[0.04] p-5">
                <View className="flex-row items-center">
                  <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: '#6b728015' }}>
                    <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                  </View>
                  <Text className="text-base font-medium text-gray-300">Version</Text>
                </View>
                <Text className="text-sm text-gray-600">1.0.0</Text>
              </View>
              <SettingRow
                icon="star-outline"
                iconColor="#f59e0b"
                label="Rate RizzCheck"
                subtitle="Leave us a review"
                onPress={handleRateApp}
                showChevron
                last
              />
            </View>

            {/* Sign Out */}
            <TouchableOpacity
              className="mb-5 overflow-hidden rounded-3xl border border-white/[0.06]"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center p-5">
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                  <Ionicons name="log-out-outline" size={18} color="#f87171" />
                </View>
                <Text className="text-base font-medium text-red-400">Sign Out</Text>
              </View>
            </TouchableOpacity>

            {/* Danger Zone */}
            <SectionHeader title="Danger Zone" />
            <View className="rounded-3xl border border-red-500/20 bg-red-500/5">
              <Pressable className="flex-row items-center p-5" onPress={confirmDelete}>
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </View>
                <View>
                  <Text className="text-base font-medium text-red-400">Delete Account</Text>
                  <Text className="mt-0.5 text-xs text-red-500/60">Permanently remove all your data</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <SupportTicketModal visible={showSupport} onClose={() => setShowSupport(false)} appId="rizzcheck" userEmail={user?.email} />

        <Modal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Deletion">
          <Text className="mb-4 text-sm text-gray-400">
            Enter your password to confirm account deletion. This cannot be undone.
          </Text>
          <View className="mb-4">
            <Input
              placeholder="Your password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              dark
            />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button title="Cancel" variant="secondary" onPress={() => setShowDeleteModal(false)} />
            </View>
            <View className="flex-1">
              <Button title="Delete" variant="destructive" onPress={handleDeleteAccount} isLoading={isDeleting} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-600">
      {title}
    </Text>
  );
}

function SettingRow({
  icon,
  iconColor,
  label,
  subtitle,
  right,
  onPress,
  showChevron,
  last,
}: {
  icon: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  last?: boolean;
}) {
  const Row = onPress ? TouchableOpacity : View;
  return (
    <Row
      className={`flex-row items-center justify-between p-5 ${!last ? 'border-b border-white/[0.04]' : ''}`}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      <View className="flex-1 flex-row items-center">
        <View
          className="mr-3 h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconColor + '15' }}
        >
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-300">{label}</Text>
          {subtitle && <Text className="mt-0.5 text-xs text-gray-600">{subtitle}</Text>}
        </View>
      </View>
      {right}
      {showChevron && <Ionicons name="chevron-forward" size={18} color="#374151" />}
    </Row>
  );
}

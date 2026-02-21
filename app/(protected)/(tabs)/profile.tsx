import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import { RizzStats } from '../../../types/rizz';
import { hapticSelection } from '../../../lib/haptics';
import { analyticsEvents, trackEvent } from '../../../lib/analytics';
import { shareAppInvite } from '../../../lib/share';

const APP_STORE_URL = 'https://apps.apple.com/app/rizzcheck/id0000000000';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const [stats, setStats] = useState<RizzStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/rizz/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const rizzScore = stats
    ? Math.min(999, stats.total_rizzes * 10 + stats.longest_streak * 5)
    : 0;
  const initial = user?.email?.[0]?.toUpperCase() || '?';
  const rizzLevel =
    rizzScore < 100
      ? 'Beginner'
      : rizzScore < 300
        ? 'Rising Star'
        : rizzScore < 500
          ? 'Smooth Talker'
          : 'Rizz God';

  return (
    <LinearGradient colors={['#0a0a14', '#12121f', '#1a1a2e']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Header */}
          <View className="items-center px-6 pb-2 pt-6">
            <LinearGradient
              colors={['#ec4899', '#a855f7']}
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#ec4899',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
              }}
            >
              <Text className="text-3xl font-bold text-white">{initial}</Text>
            </LinearGradient>
            <Text className="mt-4 text-xl font-bold text-white">{user?.email}</Text>
            <View className="mt-2">
              {isSubscribed ? (
                <LinearGradient
                  colors={['#ec4899', '#a855f7']}
                  style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 }}
                >
                  <Text className="text-xs font-bold text-white">PRO MEMBER</Text>
                </LinearGradient>
              ) : (
                <View className="rounded-xl bg-white/5 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-gray-500">Free Plan</Text>
                </View>
              )}
            </View>
          </View>

          {/* Rizz Score */}
          <View
            className="mx-5 mb-5 mt-6 items-center rounded-3xl border border-white/[0.06] py-7"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-600">
              Rizz Score
            </Text>
            <LinearGradient
              colors={['#ec4899', '#a855f7', '#6366f1']}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#a855f7',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
              }}
            >
              <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-[#0f0f1a]">
                {loading ? (
                  <ActivityIndicator color="#ec4899" />
                ) : (
                  <Text className="text-4xl font-bold text-white">{rizzScore}</Text>
                )}
              </View>
            </LinearGradient>
            <Text className="mt-4 text-sm font-semibold text-gray-400">{rizzLevel}</Text>
          </View>

          {/* Stats Grid */}
          <View className="mx-3.5 mb-5 flex-row flex-wrap">
            <StatCard
              icon="flash"
              label="Total Rizzes"
              value={stats?.total_rizzes?.toString() || '0'}
              color="#ec4899"
            />
            <StatCard
              icon="flame"
              label="Current Streak"
              value={stats?.current_streak?.toString() || '0'}
              color="#f59e0b"
              suffix=" days"
            />
            <StatCard
              icon="trophy"
              label="Best Streak"
              value={stats?.longest_streak?.toString() || '0'}
              color="#a855f7"
              suffix=" days"
            />
            <StatCard
              icon="today"
              label="Used Today"
              value={stats?.free_uses_today?.toString() || '0'}
              color="#22c55e"
              suffix="/5"
            />
          </View>

          {/* Upgrade Banner */}
          {!isSubscribed && (
            <TouchableOpacity
              className="mx-5 mb-5"
              onPress={() => {
                hapticSelection();
                router.push('/(protected)/paywall');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ec4899', '#a855f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 24, padding: 1.5 }}
              >
                <View className="flex-row items-center justify-between rounded-[22px] bg-[#12121f] p-5">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white">
                      Unlock Unlimited Rizz
                    </Text>
                    <Text className="mt-1 text-sm text-gray-400">
                      Remove limits & get all features
                    </Text>
                  </View>
                  <LinearGradient
                    colors={['#ec4899', '#a855f7']}
                    style={{ borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 }}
                  >
                    <Text className="text-sm font-bold text-white">Upgrade</Text>
                  </LinearGradient>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Quick Actions */}
          <View className="mx-5">
            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-600">
              Quick Actions
            </Text>
            <View
              className="overflow-hidden rounded-3xl border border-white/[0.06]"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <ActionRow
                icon="settings-outline"
                label="Settings"
                color="#6b7280"
                onPress={() => {
                  hapticSelection();
                  router.push('/(protected)/settings');
                }}
              />
              <ActionRow
                icon="diamond-outline"
                label="Manage Subscription"
                color="#ec4899"
                onPress={() => {
                  hapticSelection();
                  router.push('/(protected)/paywall');
                }}
              />
              <ActionRow
                icon="share-outline"
                label="Share RizzCheck"
                color="#3b82f6"
                onPress={async () => {
                  hapticSelection();
                  trackEvent(analyticsEvents.shareAppTapped, { source: 'profile' });
                  try {
                    const shared = await shareAppInvite(APP_STORE_URL);
                    if (shared) {
                      trackEvent(analyticsEvents.shareAppCompleted, { source: 'profile' });
                    }
                  } catch {}
                }}
              />
              <ActionRow
                icon="help-circle-outline"
                label="Help & Support"
                color="#22c55e"
                onPress={() => {
                  hapticSelection();
                  import('react-native').then(({ Linking }) =>
                    Linking.openURL('mailto:support@rizzcheck.app?subject=RizzCheck Support')
                  );
                }}
                last
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  suffix?: string;
}) {
  return (
    <View className="w-1/2 p-1.5">
      <View
        className="rounded-2xl border border-white/[0.06] p-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <View
          className="mb-3 h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: color + '15' }}
        >
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text className="text-2xl font-bold text-white">
          {value}
          {suffix && <Text className="text-sm text-gray-500">{suffix}</Text>}
        </Text>
        <Text className="mt-1 text-xs text-gray-500">{label}</Text>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  color,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between p-5 ${!last ? 'border-b border-white/[0.04]' : ''}`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <View
          className="mr-3 h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: color + '15' }}
        >
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text className="text-base font-medium text-gray-300">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#374151" />
    </TouchableOpacity>
  );
}

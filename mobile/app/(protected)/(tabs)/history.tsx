import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import api from '../../../lib/api';
import { RizzResponse, TONES } from '../../../types/rizz';
import { hapticSelection, hapticSuccess } from '../../../lib/haptics';
import { useAuth } from '../../../contexts/AuthContext';
import {
  loadGuestRizzHistory,
  normalizeGuestRizzResponse,
  saveGuestRizzHistories,
} from '../../../lib/guestRizzHistory';

export default function HistoryScreen() {
  const { isGuest, guestUsageCount } = useAuth();
  const [history, setHistory] = useState<RizzResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchHistory = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const res = await api.get(`/rizz/history?page=${pageNum}&limit=20`);
      const items = res.data.history || [];
      setTotal(res.data.total || 0);
      if (refresh || pageNum === 1) {
        setHistory(items);
      } else {
        setHistory((prev) => [...prev, ...items]);
      }
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchGuestHistory = async () => {
    try {
      let source = await loadGuestRizzHistory();
      if (source.length === 0) {
        try {
          const res = await api.get('/rizz/history?page=1&limit=50');
          const remoteItems = Array.isArray(res.data?.history) ? res.data.history : [];
          if (remoteItems.length > 0) {
            const normalizedRemote = remoteItems.map((item: any) => normalizeGuestRizzResponse(item));
            await saveGuestRizzHistories(normalizedRemote);
            source = normalizedRemote;
          }
        } catch {
          // Guest can run in local-only mode.
        }
      }
      setHistory(source);
      setTotal(source.length);
      setPage(1);
    } catch {
      setHistory([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isGuest) {
      fetchGuestHistory();
      return;
    }
    fetchHistory();
  }, [isGuest]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (isGuest) {
      fetchGuestHistory();
      return;
    }
    fetchHistory(1, true);
  }, [isGuest]);

  const handleLoadMore = () => {
    if (isGuest) return;
    if (history.length < total) {
      fetchHistory(page + 1);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    hapticSuccess();
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getToneColor = (toneId: string) =>
    TONES.find((t) => t.id === toneId)?.color || '#6b7280';

  const getToneEmoji = (toneId: string) =>
    TONES.find((t) => t.id === toneId)?.emoji || '💬';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: RizzResponse }) => {
    const isExpanded = expandedId === item.id;
    const toneColor = getToneColor(item.tone);
    const responses = [item.response_1, item.response_2, item.response_3].filter(Boolean);

    return (
      <TouchableOpacity
        className="mx-5 mb-3 overflow-hidden rounded-3xl border border-white/[0.06]"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        onPress={() => {
          hapticSelection();
          setExpandedId(isExpanded ? null : item.id);
        }}
        activeOpacity={0.7}
      >
        <View className="p-5">
          {/* Header */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="mr-2 rounded-lg px-2.5 py-1"
                style={{ backgroundColor: toneColor + '20' }}
              >
                <Text style={{ color: toneColor }} className="text-xs font-bold">
                  {getToneEmoji(item.tone)} {item.tone}
                </Text>
              </View>
              <View className="rounded-lg bg-white/5 px-2 py-1">
                <Text className="text-xs text-gray-600">{item.category}</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-600">{formatDate(item.created_at)}</Text>
          </View>

          {/* Input preview */}
          <Text
            className="text-sm leading-5 text-gray-400"
            numberOfLines={isExpanded ? undefined : 2}
          >
            {item.input_text}
          </Text>

          {/* Expanded responses */}
          {isExpanded && responses.length > 0 && (
            <View className="mt-4 border-t border-white/[0.04] pt-4">
              <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-600">
                Generated Responses
              </Text>
              {responses.map((resp, idx) => {
                const key = `${item.id}-${idx}`;
                return (
                  <TouchableOpacity
                    key={idx}
                    className="mb-2 flex-row items-start rounded-2xl bg-white/[0.03] p-4"
                    onPress={() => handleCopy(resp, key)}
                    activeOpacity={0.7}
                  >
                    <View
                      className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: toneColor + '20' }}
                    >
                      <Text style={{ color: toneColor }} className="text-xs font-bold">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text className="flex-1 text-sm leading-5 text-gray-300">{resp}</Text>
                    <View className="ml-2 mt-0.5">
                      {copiedKey === key ? (
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                      ) : (
                        <Ionicons name="copy-outline" size={16} color="#4b5563" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Expand indicator */}
          <View className="mt-3 items-center">
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#374151"
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center px-10 pt-20">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white/5">
        <Ionicons name="time-outline" size={44} color="#374151" />
      </View>
      <Text className="mb-2 text-xl font-bold text-white">No History Yet</Text>
      <Text className="text-center text-sm leading-5 text-gray-500">
        {isGuest
          ? `Your guest previews will appear here.${'\n'}Generate your first rizz response.`
          : `Your generated responses will appear here.${'\n'}Go generate some rizz!`}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#0a0a14', '#12121f', '#1a1a2e']} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center" edges={['top']}>
          <ActivityIndicator size="large" color="#ec4899" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a0a14', '#12121f', '#1a1a2e']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-6 pb-4 pt-4">
          <Text className="text-3xl font-bold text-white">History</Text>
          {total > 0 && (
            <Text className="mt-1 text-sm text-gray-500">{total} generations</Text>
          )}
        </View>

        {isGuest && (
          <View className="mx-5 mb-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
            <Text className="text-sm font-semibold text-amber-200">Guest history enabled</Text>
            <Text className="mt-1 text-xs leading-5 text-amber-100/80">
              Local previews are stored for 30 days. Create an account to keep them permanently.
            </Text>
            <View className="mt-3 flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 rounded-xl bg-white px-3 py-2.5"
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.8}
              >
                <Text className="text-center text-xs font-bold text-black">Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl border border-white/20 px-3 py-2.5"
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.8}
              >
                <Text className="text-center text-xs font-semibold text-white">Sign In</Text>
              </TouchableOpacity>
            </View>
            <Text className="mt-2 text-xs text-amber-100/70">Used {guestUsageCount}/3 guest previews</Text>
          </View>
        )}

        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#ec4899"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

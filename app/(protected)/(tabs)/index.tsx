import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import api from '../../../lib/api';
import { hapticSuccess, hapticSelection, hapticError } from '../../../lib/haptics';
import { analyticsEvents, trackEvent } from '../../../lib/analytics';
import { shareResponseCard } from '../../../lib/share';
import { TONES, CATEGORIES, RizzStats } from '../../../types/rizz';

const TONE_COLORS: Record<string, [string, string]> = {
  flirty: ['#ec4899', '#f472b6'],
  professional: ['#3b82f6', '#60a5fa'],
  funny: ['#f59e0b', '#fbbf24'],
  chill: ['#22c55e', '#4ade80'],
  savage: ['#ef4444', '#f87171'],
  romantic: ['#f43f5e', '#fb7185'],
  confident: ['#8b5cf6', '#a78bfa'],
  mysterious: ['#6366f1', '#818cf8'],
};

const APP_STORE_URL = 'https://apps.apple.com/app/rizzcheck/id0000000000';

/** Skeleton shimmer card shown while generating responses */
function SkeletonCard({ index }: { index: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, delay: index * 100, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, index]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={{ opacity }}
      className="mb-3 overflow-hidden rounded-3xl border border-white/[0.06] p-5"
    >
      <View style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} className="rounded-3xl">
        <View className="flex-row items-start">
          <View className="mr-3 mt-0.5 h-7 w-7 rounded-full bg-white/5" />
          <View className="flex-1">
            <View className="mb-2 h-4 w-3/4 rounded bg-white/5" />
            <View className="mb-2 h-4 w-full rounded bg-white/5" />
            <View className="h-4 w-1/2 rounded bg-white/5" />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState('chill');
  const [selectedCategory, setSelectedCategory] = useState('casual');
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RizzStats | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (inputText.length >= 5 && !loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [inputText, loading]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/rizz/stats');
      setStats(res.data);
      if (res.data.free_uses_today >= 5) {
        setLimitReached(true);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const animateResponses = (count: number) => {
    fadeAnims.length = 0;
    for (let i = 0; i < count; i++) {
      fadeAnims.push(new Animated.Value(0));
    }
    const animations = fadeAnims.map((anim, i) =>
      Animated.timing(anim, { toValue: 1, duration: 400, delay: i * 150, useNativeDriver: true })
    );
    Animated.stagger(150, animations).start();
  };

  const handleGenerate = async () => {
    if (inputText.length < 5) {
      hapticError();
      return;
    }
    trackEvent(analyticsEvents.rizzGenerateRequested, {
      input_length: inputText.length,
      tone: selectedTone,
      category: selectedCategory,
    });
    hapticSelection();
    setLoading(true);
    setResponses([]);
    setCurrentResponseId(null);
    setLimitReached(false);
    try {
      const res = await api.post('/rizz/generate', {
        input_text: inputText,
        tone: selectedTone,
        category: selectedCategory,
      });
      // Unified backend returns { data: { id, response_1, response_2, response_3, ... } }
      const resData = res.data.data;
      const newResponses = [resData.response_1, resData.response_2, resData.response_3].filter(Boolean);
      setCurrentResponseId(resData.id || null);
      setResponses(newResponses);
      animateResponses(newResponses.length);
      hapticSuccess();
      trackEvent(analyticsEvents.rizzGenerateSucceeded, {
        tone: selectedTone,
        category: selectedCategory,
        response_count: newResponses.length,
      });
      fetchStats();
    } catch (err: any) {
      hapticError();
      if (err.response?.status === 429 || err.response?.data?.limit_reached) {
        setLimitReached(true);
        trackEvent(analyticsEvents.rizzLimitReached, {
          tone: selectedTone,
          category: selectedCategory,
        });
        fetchStats();
      } else {
        trackEvent(analyticsEvents.rizzGenerateFailed, {
          status_code: err.response?.status || 0,
        });
        Alert.alert('Error', 'Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, idx: number) => {
    await Clipboard.setStringAsync(text);
    hapticSuccess();
    trackEvent(analyticsEvents.rizzResponseCopied, {
      index: idx + 1,
      tone: selectedTone,
      category: selectedCategory,
    });
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);

    // Track which response the user selected
    if (currentResponseId) {
      api.post('/rizz/select', {
        response_id: currentResponseId,
        selected_idx: idx + 1,
      }).catch(() => {});
    }
  };

  const handleShare = async (text: string, idx: number) => {
    try {
      const shared = await shareResponseCard({
        response: text,
        tone: selectedTone,
        category: selectedCategory,
        appUrl: APP_STORE_URL,
      });
      if (shared) {
        hapticSuccess();
        trackEvent(analyticsEvents.rizzResponseShared, {
          index: idx + 1,
          tone: selectedTone,
          category: selectedCategory,
        });
      }
    } catch {
      // Non-blocking share flow.
    }
  };

  const freeUsesLeft = stats ? Math.max(0, 5 - stats.free_uses_today) : 5;
  const usagePercent = stats ? (stats.free_uses_today / 5) * 100 : 0;

  return (
    <LinearGradient colors={['#0a0a14', '#12121f', '#1a1a2e']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pt-4">
            {/* Header */}
            <View className="mb-5 flex-row items-center">
              <LinearGradient
                colors={['#ec4899', '#a855f7']}
                style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 20 }}>💬</Text>
              </LinearGradient>
              <View className="ml-3">
                <Text className="text-2xl font-bold text-white">RizzCheck</Text>
                <Text className="text-xs text-gray-500">AI texting assistant</Text>
              </View>
            </View>

            {/* Usage Bar */}
            <View className="mb-5 rounded-2xl border border-white/[0.06] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-gray-500">Daily Free Uses</Text>
                <View className="flex-row items-center">
                  {stats && stats.current_streak > 0 && (
                    <View className="mr-3 flex-row items-center">
                      <Text className="text-sm">🔥</Text>
                      <Text className="ml-1 text-xs font-semibold text-orange-400">
                        {stats.current_streak}
                      </Text>
                    </View>
                  )}
                  <Text className="text-xs font-bold text-gray-400">{freeUsesLeft} left</Text>
                </View>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-white/5">
                <LinearGradient
                  colors={usagePercent >= 100 ? ['#ef4444', '#dc2626'] : ['#ec4899', '#a855f7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: '100%', width: `${Math.min(usagePercent, 100)}%`, borderRadius: 999 }}
                />
              </View>
            </View>

            {/* Limit Banner */}
            {limitReached && (
              <TouchableOpacity
                onPress={() => {
                  trackEvent(analyticsEvents.paywallViewed, { source: 'limit_banner' });
                  router.push('/(protected)/paywall');
                }}
                className="mb-5"
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ec4899', '#a855f7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 20, padding: 1 }}
                >
                  <View className="flex-row items-center justify-between rounded-[19px] bg-[#12121f] px-5 py-4">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-white">Daily limit reached</Text>
                      <Text className="mt-1 text-sm text-gray-400">Upgrade for unlimited rizz</Text>
                    </View>
                    <LinearGradient
                      colors={['#ec4899', '#a855f7']}
                      style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}
                    >
                      <Text className="text-sm font-bold text-white">Upgrade</Text>
                    </LinearGradient>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Input */}
            <View
              className="mb-5 overflow-hidden rounded-3xl border border-white/[0.06]"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <View className="p-5">
                <View className="mb-3 flex-row items-center">
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6b7280" />
                  <Text className="ml-2 text-sm font-semibold text-gray-500">Incoming message</Text>
                </View>
                <TextInput
                  className="min-h-28 rounded-2xl p-4 text-base leading-6 text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  placeholder="Paste the message you received..."
                  placeholderTextColor="#374151"
                  multiline
                  value={inputText}
                  onChangeText={setInputText}
                  maxLength={1000}
                />
                {inputText.length > 0 && (
                  <Text className="mt-2 text-right text-xs text-gray-600">
                    {inputText.length}/1000
                  </Text>
                )}
              </View>
            </View>

            {/* Tone */}
            <View className="mb-5">
              <View className="mb-3 flex-row items-center">
                <Ionicons name="color-palette-outline" size={16} color="#6b7280" />
                <Text className="ml-2 text-sm font-semibold text-gray-500">Vibe</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TONES.map((item) => {
                  const isSelected = selectedTone === item.id;
                  const colors = TONE_COLORS[item.id] || ['#6b7280', '#9ca3af'];
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        hapticSelection();
                        setSelectedTone(item.id);
                      }}
                      className="mr-2"
                      activeOpacity={0.7}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ borderRadius: 16, padding: 1 }}
                        >
                          <View className="rounded-[15px] bg-[#12121f] px-4 py-2.5">
                            <Text style={{ color: colors[0] }} className="text-sm font-bold">
                              {item.emoji} {item.label}
                            </Text>
                          </View>
                        </LinearGradient>
                      ) : (
                        <View
                          className="rounded-2xl border border-white/[0.06] px-4 py-2.5"
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                        >
                          <Text className="text-sm font-medium text-gray-600">
                            {item.emoji} {item.label}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Category */}
            <View className="mb-6">
              <View className="mb-3 flex-row items-center">
                <Ionicons name="grid-outline" size={14} color="#6b7280" />
                <Text className="ml-2 text-sm font-semibold text-gray-500">Context</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((item) => {
                  const isSelected = selectedCategory === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        hapticSelection();
                        setSelectedCategory(item.id);
                      }}
                      className="mr-2"
                      activeOpacity={0.7}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={['#ec4899', '#a855f7']}
                          style={{ borderRadius: 16, padding: 1 }}
                        >
                          <View className="rounded-[15px] bg-[#12121f] px-4 py-2.5">
                            <Text className="text-sm font-bold text-primary-400">
                              {item.emoji} {item.label}
                            </Text>
                          </View>
                        </LinearGradient>
                      ) : (
                        <View
                          className="rounded-2xl border border-white/[0.06] px-4 py-2.5"
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                        >
                          <Text className="text-sm font-medium text-gray-600">
                            {item.emoji} {item.label}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Generate Button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 24 }}>
              <TouchableOpacity
                onPress={handleGenerate}
                disabled={loading || inputText.length < 5 || limitReached}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    limitReached
                      ? ['#374151', '#374151']
                      : inputText.length >= 5
                        ? ['#ec4899', '#a855f7', '#6366f1']
                        : ['#1f2937', '#1f2937']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 20,
                    paddingVertical: 18,
                    opacity: inputText.length < 5 || limitReached ? 0.4 : 1,
                  }}
                >
                  {loading ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator color="white" />
                      <Text className="ml-3 text-base font-bold text-white/80">Generating...</Text>
                    </View>
                  ) : (
                    <Text className="text-center text-lg font-bold text-white">
                      {limitReached ? 'Upgrade to Continue' : 'Generate Rizz ✨'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Skeleton Loading State */}
            {loading && (
              <View>
                <View className="mb-4 flex-row items-center">
                  <Ionicons name="sparkles" size={18} color="#a855f7" />
                  <Text className="ml-2 text-lg font-bold text-white">Generating...</Text>
                </View>
                {[0, 1, 2].map((i) => (
                  <SkeletonCard key={i} index={i} />
                ))}
              </View>
            )}

            {/* Responses */}
            {!loading && responses.length > 0 && (
              <View>
                <View className="mb-4 flex-row items-center">
                  <Ionicons name="sparkles" size={18} color="#a855f7" />
                  <Text className="ml-2 text-lg font-bold text-white">Your responses</Text>
                </View>
                {responses.map((response, idx) => {
                  const fadeAnim = fadeAnims[idx] || new Animated.Value(1);
                  return (
                    <Animated.View
                      key={idx}
                      style={{
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0],
                            }),
                          },
                        ],
                      }}
                    >
                      <TouchableOpacity
                        className="mb-3 overflow-hidden rounded-3xl border border-white/[0.06]"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                        onPress={() => handleCopy(response, idx)}
                        activeOpacity={0.7}
                      >
                        <View className="p-5">
                          <View className="flex-row items-start">
                            <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary-500/10">
                              <Text className="text-xs font-bold text-primary-400">{idx + 1}</Text>
                            </View>
                            <Text className="flex-1 text-base leading-6 text-gray-200">
                              {response}
                            </Text>
                          </View>
                          <View className="mt-4 flex-row items-center">
                            <View className="flex-row items-center rounded-full bg-white/5 px-3 py-1.5">
                              {copied === idx ? (
                                <>
                                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                                  <Text className="ml-1.5 text-xs font-semibold text-green-400">
                                    Copied!
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Ionicons name="copy-outline" size={14} color="#6b7280" />
                                  <Text className="ml-1.5 text-xs font-medium text-gray-500">
                                    Tap to copy
                                  </Text>
                                </>
                              )}
                            </View>
                            <TouchableOpacity
                              className="ml-2 flex-row items-center rounded-full bg-white/5 px-3 py-1.5"
                              onPress={() => handleShare(response, idx)}
                              activeOpacity={0.75}
                            >
                              <Ionicons name="share-social-outline" size={14} color="#6b7280" />
                              <Text className="ml-1.5 text-xs font-medium text-gray-500">
                                Share card
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

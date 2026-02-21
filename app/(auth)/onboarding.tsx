import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection, hapticSuccess } from '../../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
  features?: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[];
  isCTA?: boolean;
}

const STEPS: OnboardingStep[] = [
  {
    id: 0,
    title: 'Welcome to\nRizzCheck',
    subtitle: 'Your AI-powered texting assistant that helps you craft the perfect response every time.',
    emoji: '\u{1F4AC}',
  },
  {
    id: 1,
    title: 'Never Run\nOut of Rizz',
    subtitle: 'Everything you need to level up your texting game.',
    emoji: '\u{1F525}',
    features: [
      {
        icon: 'sparkles',
        title: 'AI Responses',
        desc: 'Smart replies crafted by AI for any conversation',
      },
      {
        icon: 'color-palette',
        title: '8 Tone Styles',
        desc: 'From flirty to friendly, pick your perfect vibe',
      },
      {
        icon: 'flame',
        title: 'Streak Tracking',
        desc: 'Build your streak and watch your confidence grow',
      },
    ],
  },
  {
    id: 2,
    title: 'Ready to\nLevel Up?',
    subtitle: 'Join thousands who are already texting with confidence.',
    emoji: '\u{1F680}',
    isCTA: true,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const step = Math.round(offsetX / SCREEN_WIDTH);
    if (step !== currentStep) {
      setCurrentStep(step);
      hapticSelection();
    }
  };

  const goToStep = (step: number) => {
    hapticSelection();
    scrollRef.current?.scrollTo({ x: step * SCREEN_WIDTH, animated: true });
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const completeOnboarding = async (destination: '/(auth)/register' | '/(auth)/login') => {
    hapticSuccess();
    await AsyncStorage.setItem('@onboarding_complete', 'true');
    router.push(destination);
  };

  const renderStep = (step: OnboardingStep) => (
    <View key={step.id} style={{ width: SCREEN_WIDTH, flex: 1, paddingHorizontal: 32 }}>
      {/* Emoji */}
      <View style={{ alignItems: 'center', marginTop: 60 }}>
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(236, 72, 153, 0.12)',
          }}
        >
          <Text style={{ fontSize: 56 }}>{step.emoji}</Text>
        </View>
      </View>

      {/* Title */}
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 36,
            fontWeight: '800',
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 44,
          }}
        >
          {step.title}
        </Text>
      </View>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          marginTop: 16,
          lineHeight: 24,
          paddingHorizontal: 8,
        }}
      >
        {step.subtitle}
      </Text>

      {/* Feature cards */}
      {step.features && (
        <View style={{ marginTop: 32, gap: 16 }}>
          {step.features.map((feat, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <LinearGradient
                colors={['#ec4899', '#a855f7'] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={feat.icon} size={22} color="#ffffff" />
              </LinearGradient>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                  {feat.title}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {feat.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* CTA Buttons */}
      {step.isCTA && (
        <View style={{ marginTop: 40, gap: 14 }}>
          <Pressable
            onPress={() => completeOnboarding('/(auth)/register')}
            style={{ minHeight: 56 }}
          >
            <LinearGradient
              colors={['#ec4899', '#a855f7'] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 56,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff' }}>
                Get Started
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => completeOnboarding('/(auth)/login')}
            style={{
              height: 56,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
              Already have an account?{' '}
              <Text style={{ fontWeight: '700', color: '#ec4899' }}>Log In</Text>
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={['#0a0a14', '#12121f', '#1a1a2e'] as any}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Skip button */}
        {currentStep < STEPS.length - 1 && (
          <Pressable
            onPress={() => goToStep(STEPS.length - 1)}
            style={{
              position: 'absolute',
              top: insets.top + 12,
              right: 24,
              zIndex: 10,
              paddingVertical: 8,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
              Skip
            </Text>
          </Pressable>
        )}

        {/* Scrollable steps */}
        <Animated.ScrollView
          ref={scrollRef as any}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {STEPS.map(renderStep)}
        </Animated.ScrollView>

        {/* Bottom section: dots + next button */}
        <View
          style={{
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 32,
            alignItems: 'center',
          }}
        >
          {/* Dot indicators */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {STEPS.map((_, idx) => {
              const inputRange = [
                (idx - 1) * SCREEN_WIDTH,
                idx * SCREEN_WIDTH,
                (idx + 1) * SCREEN_WIDTH,
              ];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={idx}
                  style={{
                    height: 8,
                    width: dotWidth,
                    borderRadius: 4,
                    backgroundColor: '#ec4899',
                    opacity: dotOpacity,
                  }}
                />
              );
            })}
          </View>

          {/* Next button (only on non-CTA steps) */}
          {currentStep < STEPS.length - 1 && (
            <Pressable onPress={handleNext} style={{ width: '100%', minHeight: 56 }}>
              <LinearGradient
                colors={['#ec4899', '#a855f7'] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 56,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
                  Next
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

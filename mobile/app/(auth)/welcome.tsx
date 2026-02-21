import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { hapticMedium, hapticSelection } from '../../lib/haptics';
import { setHasSeenOnboarding } from '../../lib/settings';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '💬',
    title: 'Never Lost\nfor Words',
    subtitle: 'AI-powered responses that sound like you,\njust smoother and more confident',
    gradient: ['#ec4899', '#a855f7'] as [string, string],
  },
  {
    id: '2',
    emoji: '🎯',
    title: 'Pick Your\nVibe',
    subtitle: 'Flirty, funny, savage, or chill —\nchoose the perfect tone every time',
    gradient: ['#a855f7', '#6366f1'] as [string, string],
  },
  {
    id: '3',
    emoji: '🚀',
    title: 'Level Up\nYour Game',
    subtitle: 'Track your streak, build your rizz score,\nand never miss an opportunity',
    gradient: ['#6366f1', '#06b6d4'] as [string, string],
  },
];

export default function WelcomeScreen() {
  const { continueAsGuest } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const completeOnboarding = async () => {
    await setHasSeenOnboarding(true);
  };

  const handleNext = () => {
    hapticSelection();
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    hapticMedium();
    await completeOnboarding();
    router.push('/(auth)/login');
  };

  const handleSkip = async () => {
    hapticSelection();
    await completeOnboarding();
    router.push('/(auth)/login');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-10">
      <LinearGradient
        colors={item.gradient}
        style={{
          width: 120,
          height: 120,
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 48,
          shadowColor: item.gradient[0],
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
        }}
      >
        <Text style={{ fontSize: 56 }}>{item.emoji}</Text>
      </LinearGradient>
      <Text className="mb-5 text-center text-4xl font-bold leading-tight text-white">
        {item.title}
      </Text>
      <Text className="text-center text-base leading-6 text-gray-400">
        {item.subtitle}
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={['#0a0a14', '#12121f', '#1a1a2e']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="h-12 flex-row justify-end px-6 pt-2">
          {currentIndex < SLIDES.length - 1 && (
            <TouchableOpacity onPress={handleSkip} className="px-4 py-2">
              <Text className="text-base font-medium text-gray-500">Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          keyExtractor={(item) => item.id}
        />

        <View className="px-8 pb-8">
          <View className="mb-8 flex-row items-center justify-center">
            {SLIDES.map((_, i) => {
              const inputRange = [
                (i - 1) * SCREEN_WIDTH,
                i * SCREEN_WIDTH,
                (i + 1) * SCREEN_WIDTH,
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
                  key={i}
                  style={{
                    width: dotWidth,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#ec4899',
                    opacity: dotOpacity,
                    marginHorizontal: 4,
                  }}
                />
              );
            })}
          </View>

          <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient
              colors={['#ec4899', '#a855f7', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 20,
                paddingVertical: 18,
                shadowColor: '#ec4899',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
              }}
            >
              <Text className="text-center text-lg font-bold text-white">
                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await completeOnboarding();
              router.push('/(auth)/login');
            }}
            className="mt-5 items-center"
          >
            <Text className="text-sm text-gray-500">
              Already have an account?{' '}
              <Text className="font-semibold text-primary-400">Sign In</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              hapticSelection();
              await completeOnboarding();
              await continueAsGuest();
              router.replace('/(protected)/(tabs)');
            }}
            className="mt-3 items-center"
          >
            <Text className="text-sm text-gray-400">
              Try free without account
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppleSignInButton from '../../components/ui/AppleSignInButton';
import { hapticSelection } from '../../lib/haptics';

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = async () => {
    hapticSelection();
    await continueAsGuest();
    router.replace('/(protected)/(tabs)');
  };

  return (
    <LinearGradient colors={['#0a0a14', '#1e1e2e', '#2d1b3d']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-8">
          <View className="mb-10 items-center">
            <Text className="text-5xl">💬</Text>
            <Text className="mt-3 text-4xl font-bold text-white">RizzCheck</Text>
            <Text className="mt-2 text-base text-gray-400">AI-powered texting assistant</Text>
          </View>

          {error ? (
            <View className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <Text className="text-center text-sm text-red-400">{error}</Text>
            </View>
          ) : null}

          <View className="mb-4">
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              dark
            />
          </View>

          <View className="mb-6">
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              dark
            />
          </View>

          <Button title="Sign In" onPress={handleLogin} isLoading={isLoading} size="lg" variant="gradient" />

          <AppleSignInButton onError={(msg) => setError(msg)} />

          <Pressable
            className="mt-5 items-center py-2"
            onPress={handleGuestMode}
          >
            <Text className="text-base font-medium text-gray-400">Try Free Without Account</Text>
            <Text className="mt-1 text-xs text-gray-600">3 preview generations included</Text>
          </Pressable>

          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-gray-500">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text className="font-semibold text-primary-400">Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

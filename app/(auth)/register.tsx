import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import { hapticSelection } from '../../lib/haptics';

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    hapticSelection();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password);
      router.replace('/(protected)/(tabs)');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Network Error')) {
        setError('No internet connection. Please try again.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0a0a14', '#12121f', '#1a1a2e'] as any}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 32,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: 8,
            }}
          >
            Create account
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 32,
            }}
          >
            Start leveling up your texting game
          </Text>

          {/* Error */}
          {error ? (
            <View
              style={{
                marginBottom: 16,
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.2)',
              }}
            >
              <Text style={{ fontSize: 14, color: '#f87171' }}>{error}</Text>
            </View>
          ) : null}

          {/* Inputs */}
          <View style={{ marginBottom: 16 }}>
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

          <View style={{ marginBottom: 16 }}>
            <Input
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              dark
            />
          </View>

          <View style={{ marginBottom: 28 }}>
            <Input
              label="Confirm Password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              dark
            />
          </View>

          {/* Gradient submit button */}
          <Pressable
            onPress={handleRegister}
            disabled={isLoading}
            style={{ minHeight: 56, opacity: isLoading ? 0.6 : 1 }}
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
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
                  Create Account
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Login link */}
          <View
            style={{
              marginTop: 28,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={{ fontWeight: '700', color: '#ec4899', fontSize: 15 }}>
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
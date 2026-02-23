import React from 'react';
import { Platform, View, Text, Pressable } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { hapticError } from '../../lib/haptics';

interface AppleSignInButtonProps {
  onError?: (error: string) => void;
}

export default function AppleSignInButton({ onError }: AppleSignInButtonProps) {
  const { loginWithApple } = useAuth();

  // Sign in with Apple is only available on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;

      await loginWithApple(
        credential.identityToken,
        credential.authorizationCode || '',
        fullName,
        credential.email || undefined
      );
      
      router.replace('/(protected)/(tabs)');
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return; // User cancelled
      }
      hapticError();
      onError?.(err.message || 'Apple Sign In failed');
    }
  };

  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <Text style={{ marginHorizontal: 16, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          or
        </Text>
        <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </View>

      <Pressable
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          backgroundColor: '#ffffff',
          height: 56,
        }}
        onPress={handleAppleSignIn}
      >
        <Text style={{ marginRight: 8, fontSize: 20, color: '#000000' }}>{'\uF8FF'}</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000' }}>
          Sign in with Apple
        </Text>
      </Pressable>
    </View>
  );
}
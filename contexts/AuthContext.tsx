import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../lib/storage';
import { hapticSuccess, hapticError } from '../lib/haptics';
import { logInPurchases, logOutPurchases } from '../lib/purchases';
import { analyticsEvents, trackEvent } from '../lib/analytics';
import type { User, AuthResponse } from '../types/auth';

const GUEST_USAGE_KEY = 'rizzcheck_guest_usage';
const GUEST_MODE_KEY = 'rizzcheck_guest_mode';
const MAX_GUEST_USES = 3;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  guestUsageCount: number;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithApple: (identityToken: string, authCode: string, fullName?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  canUseFeature: () => boolean;
  incrementGuestUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);

  const isAuthenticated = user !== null;

  // Restore session on mount
  useEffect(() => {
    trackEvent(analyticsEvents.appOpened);
    const restore = async () => {
      try {
        // Restore guest state first
        const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
        const guestUsage = await AsyncStorage.getItem(GUEST_USAGE_KEY);
        if (guestUsage) {
          setGuestUsageCount(parseInt(guestUsage, 10));
        }
        if (guestMode === 'true') {
          setIsGuest(true);
        }

        // Then check authenticated token using authenticated endpoint
        const token = await getAccessToken();
        if (token) {
          const { data } = await api.get('/auth/me');
          const restoredUser = data.user || data;
          setUser(restoredUser);
          await logInPurchases(restoredUser.id);
          // Exit guest mode when authenticated
          setIsGuest(false);
          await AsyncStorage.removeItem(GUEST_MODE_KEY);
        }
      } catch {
        await clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    restore();

    // Listen for token cleared events from api.ts (when refresh fails)
    const subscription = DeviceEventEmitter.addListener('tokenCleared', () => {
      setUser(null);
      setIsGuest(false);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      await logInPurchases(data.user.id);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      trackEvent(analyticsEvents.authLoginSuccess);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
      });
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      await logInPurchases(data.user.id);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      trackEvent(analyticsEvents.authRegisterSuccess);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  // Sign in with Apple (Guideline 4.8)
  const loginWithApple = useCallback(
    async (identityToken: string, authCode: string, fullName?: string, email?: string) => {
      try {
        const { data } = await api.post<AuthResponse>('/auth/apple', {
          identity_token: identityToken,
          authorization_code: authCode,
          full_name: fullName,
          email,
        });
        await setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
        await logInPurchases(data.user.id);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        trackEvent(analyticsEvents.authAppleSuccess);
        hapticSuccess();
      } catch (err) {
        hapticError();
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout API errors
    } finally {
      await logOutPurchases();
      await clearTokens();
      setUser(null);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      trackEvent(analyticsEvents.authLogout);
    }
  }, []);

  // Account deletion (Guideline 5.1.1)
  const deleteAccount = useCallback(
    async (password?: string) => {
      await api.delete('/auth/account', {
        data: { password: password || '' },
      });
      await logOutPurchases();
      await clearTokens();
      setUser(null);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      trackEvent(analyticsEvents.authDeleteAccount);
      hapticSuccess();
    },
    []
  );

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    setIsGuest(true);
    hapticSuccess();
  }, []);

  const canUseFeature = useCallback(() => {
    if (isAuthenticated) return true;
    return guestUsageCount < MAX_GUEST_USES;
  }, [isAuthenticated, guestUsageCount]);

  const incrementGuestUsage = useCallback(async () => {
    const newCount = guestUsageCount + 1;
    setGuestUsageCount(newCount);
    await AsyncStorage.setItem(GUEST_USAGE_KEY, newCount.toString());
  }, [guestUsageCount]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isGuest,
        guestUsageCount,
        user,
        login,
        register,
        loginWithApple,
        logout,
        deleteAccount,
        continueAsGuest,
        canUseFeature,
        incrementGuestUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
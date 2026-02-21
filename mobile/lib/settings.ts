import * as SecureStore from 'expo-secure-store';

const KEYS = {
  HAPTIC_ENABLED: 'setting_haptic',
  BIOMETRIC_ENABLED: 'setting_biometric',
  NOTIFICATIONS_ENABLED: 'setting_notifications',
  HAS_SEEN_ONBOARDING: 'has_seen_onboarding',
} as const;

async function getBool(key: string, defaultValue: boolean = true): Promise<boolean> {
  const value = await SecureStore.getItemAsync(key);
  if (value === null) return defaultValue;
  return value === '1';
}

async function setBool(key: string, value: boolean): Promise<void> {
  await SecureStore.setItemAsync(key, value ? '1' : '0');
}

export const getHapticEnabled = () => getBool(KEYS.HAPTIC_ENABLED, true);
export const setHapticEnabled = (v: boolean) => setBool(KEYS.HAPTIC_ENABLED, v);

export const getBiometricEnabled = () => getBool(KEYS.BIOMETRIC_ENABLED, false);
export const setBiometricEnabled = (v: boolean) => setBool(KEYS.BIOMETRIC_ENABLED, v);

export const getNotificationsEnabled = () => getBool(KEYS.NOTIFICATIONS_ENABLED, true);
export const setNotificationsEnabled = (v: boolean) => setBool(KEYS.NOTIFICATIONS_ENABLED, v);

export const getHasSeenOnboarding = () => getBool(KEYS.HAS_SEEN_ONBOARDING, false);
export const setHasSeenOnboarding = (v: boolean) => setBool(KEYS.HAS_SEEN_ONBOARDING, v);

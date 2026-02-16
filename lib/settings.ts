import * as SecureStore from 'expo-secure-store';

const KEYS = {
  HAPTIC_ENABLED: 'settings_haptic_enabled',
  BIOMETRIC_ENABLED: 'settings_biometric_enabled',
  NOTIFICATIONS_ENABLED: 'settings_notifications_enabled',
};

export const getHapticEnabled = async (): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(KEYS.HAPTIC_ENABLED);
  return value !== 'false'; // default true
};

export const setHapticEnabled = async (enabled: boolean): Promise<void> => {
  await SecureStore.setItemAsync(KEYS.HAPTIC_ENABLED, String(enabled));
};

export const getBiometricEnabled = async (): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
  return value === 'true'; // default false
};

export const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, String(enabled));
};

export const getNotificationsEnabled = async (): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(KEYS.NOTIFICATIONS_ENABLED);
  return value !== 'false'; // default true
};

export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  await SecureStore.setItemAsync(KEYS.NOTIFICATIONS_ENABLED, String(enabled));
};

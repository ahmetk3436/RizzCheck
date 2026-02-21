import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Cached haptic enabled state to avoid async lookups on every call.
// Updated via initHaptics() on app start and setHapticEnabledCache() on toggle.
let _enabled = true;

export function setHapticEnabledCache(enabled: boolean) {
  _enabled = enabled;
}

export function getHapticEnabledCache(): boolean {
  return _enabled;
}

/** Call on app start to load persisted haptic preference */
export async function initHaptics(): Promise<void> {
  try {
    const { getHapticEnabled } = await import('./settings');
    _enabled = await getHapticEnabled();
  } catch {
    _enabled = true;
  }
}

export const hapticSuccess = () => {
  if (_enabled && Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

export const hapticError = () => {
  if (_enabled && Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

export const hapticWarning = () => {
  if (_enabled && Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

export const hapticLight = () => {
  if (_enabled && Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

export const hapticMedium = () => {
  if (_enabled && Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

export const hapticSelection = () => {
  if (_enabled && Platform.OS === 'ios') {
    Haptics.selectionAsync();
  }
};

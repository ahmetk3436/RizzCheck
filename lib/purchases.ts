import Purchases, {
  PurchasesPackage,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let isInitialized = false;

export type { PurchasesPackage, PurchasesOffering };

export const initializePurchases = async (): Promise<boolean> => {
  if (isInitialized) return true;
  if (!API_KEY) {
    console.warn('RevenueCat API key not configured — running in mock mode');
    return false;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: API_KEY });
    isInitialized = true;
    console.log('RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    return false;
  }
};

// Make RevenueCat app_user_id match our backend user UUID so webhooks can link to users.
export const logInPurchases = async (appUserId: string): Promise<boolean> => {
  if (!appUserId) return false;
  const initialized = await initializePurchases();
  if (!initialized) return false;
  try {
    await Purchases.logIn(appUserId);
    return true;
  } catch (error) {
    console.warn('RevenueCat logIn failed:', error);
    return false;
  }
};

export const logOutPurchases = async (): Promise<boolean> => {
  if (!isInitialized) return false;
  try {
    await Purchases.logOut();
    return true;
  } catch (error) {
    console.warn('RevenueCat logOut failed:', error);
    return false;
  }
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isInitialized) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to fetch offerings:', error);
    return null;
  }
};

export const purchasePackage = async (
  pkg: PurchasesPackage,
): Promise<boolean> => {
  if (!isInitialized) {
    throw new Error('RevenueCat not initialized. Cannot process purchase. Please restart the app or contact support.');
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active.premium !== undefined;
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Purchase failed:', error);
    }
    return false;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  if (!isInitialized) {
    return checkBackendSubscriptionStatus();
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active.premium !== undefined;
  } catch (error) {
    console.error('Restore purchases failed:', error);
    return checkBackendSubscriptionStatus();
  }
};

const checkBackendSubscriptionStatus = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/api/subscription/status`, {
      timeout: 5000,
    });
    return response.data?.isPremium === true || response.data?.active === true;
  } catch (error) {
    console.error('Backend subscription check failed:', error);
    return false;
  }
};

export const checkSubscriptionStatus = async (): Promise<boolean> => {
  if (!isInitialized) {
    return checkBackendSubscriptionStatus();
  }
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active.premium !== undefined;
    if (isPremium) {
      return true;
    }
    return checkBackendSubscriptionStatus();
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return checkBackendSubscriptionStatus();
  }
};
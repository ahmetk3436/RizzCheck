export const analyticsEvents = {
  appOpened: 'app_opened',
  authLoginSuccess: 'auth_login_success',
  authRegisterSuccess: 'auth_register_success',
  authAppleSuccess: 'auth_apple_success',
  authLogout: 'auth_logout',
  authDeleteAccount: 'auth_delete_account',
  rizzGenerateRequested: 'rizz_generate_requested',
  rizzGenerateSucceeded: 'rizz_generate_succeeded',
  rizzGenerateFailed: 'rizz_generate_failed',
  rizzLimitReached: 'rizz_limit_reached',
  rizzResponseCopied: 'rizz_response_copied',
  rizzResponseShared: 'rizz_response_shared',
  paywallViewed: 'paywall_viewed',
  paywallPurchaseTapped: 'paywall_purchase_tapped',
  paywallPurchaseSucceeded: 'paywall_purchase_succeeded',
  paywallPurchaseFailed: 'paywall_purchase_failed',
  paywallRestoreTapped: 'paywall_restore_tapped',
  paywallRestoreSucceeded: 'paywall_restore_succeeded',
  paywallRestoreFailed: 'paywall_restore_failed',
  shareAppTapped: 'share_app_tapped',
  shareAppCompleted: 'share_app_completed',
} as const;

export type AnalyticsEvent = (typeof analyticsEvents)[keyof typeof analyticsEvents];

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

function cleanProps(props?: AnalyticsProps): Record<string, string | number | boolean | null> {
  if (!props) return {};
  return Object.entries(props).reduce<Record<string, string | number | boolean | null>>((acc, [k, v]) => {
    if (v === undefined) return acc;
    acc[k] = v;
    return acc;
  }, {});
}

export function trackEvent(event: AnalyticsEvent, props?: AnalyticsProps): void {
  const payload = {
    event,
    props: cleanProps(props),
    ts: new Date().toISOString(),
  };

  // Keep analytics non-blocking for UX; replace with SDK transport later.
  if (__DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === '1') {
    console.log('[analytics]', JSON.stringify(payload));
  }
}

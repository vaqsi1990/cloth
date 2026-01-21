/**
 * Cookie Consent Utility Functions
 * Manages cookie consent preferences in localStorage and API
 */

export type CookieConsent = {
  essential: boolean;
  performance: boolean;
  functional: boolean;
  targeting: boolean;
  analytics: boolean;
  timestamp: number;
};

const COOKIE_CONSENT_KEY = 'dressla_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

/**
 * Check if user is authenticated (has session)
 */
async function isAuthenticated(): Promise<boolean> {
  try {
    const response = await fetch('/api/user/me', {
      method: 'GET',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get cookie consent preferences from localStorage or API
 */
export async function getCookieConsent(): Promise<CookieConsent | null> {
  if (typeof window === 'undefined') return null;

  try {
    // First, try to get from API if user is authenticated
    const authenticated = await isAuthenticated();
    if (authenticated) {
      try {
        const response = await fetch('/api/user/cookie-consent', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.consent) {
            // Save to localStorage for consistency
            const data = {
              version: COOKIE_CONSENT_VERSION,
              consent: result.consent,
            };
            localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(data));
            return result.consent;
          }
        }
      } catch (error) {
        console.warn('Error fetching cookie consent from API:', error);
        // Fall back to localStorage
      }
    }

    // Fall back to localStorage
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    // Check if version matches (for future migrations)
    if (parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }
    return parsed.consent;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
}

/**
 * Get cookie consent preferences from localStorage (synchronous version)
 * Use this for initial render before API call completes
 */
export function getCookieConsentSync(): CookieConsent | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    // Check if version matches (for future migrations)
    if (parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }
    return parsed.consent;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
}

/**
 * Check if user has already given consent (synchronous check from localStorage)
 */
export function hasCookieConsent(): boolean {
  const consent = getCookieConsentSync();
  return consent !== null;
}

/**
 * Save cookie consent preferences to localStorage and API (if authenticated)
 */
export async function saveCookieConsent(consent: CookieConsent): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Always save to localStorage (for guest users and as backup)
    const data = {
      version: COOKIE_CONSENT_VERSION,
      consent: {
        ...consent,
        timestamp: Date.now(),
      },
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(data));

    // If user is authenticated, also save to API
    const authenticated = await isAuthenticated();
    if (authenticated) {
      try {
        const response = await fetch('/api/user/cookie-consent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            essential: consent.essential,
            performance: consent.performance,
            functional: consent.functional,
            targeting: consent.targeting,
            analytics: consent.analytics,
          }),
        });

        if (!response.ok) {
          console.warn('Failed to save cookie consent to API, but saved to localStorage');
        }
      } catch (error) {
        console.warn('Error saving cookie consent to API:', error);
        // Continue anyway - localStorage is saved
      }
    }
  } catch (error) {
    console.error('Error saving cookie consent:', error);
  }
}

/**
 * Accept all cookies (persists)
 */
export async function acceptAllCookies(): Promise<void> {
  await saveCookieConsent({
    essential: true,
    performance: true,
    functional: true,
    targeting: true,
    analytics: true,
    timestamp: Date.now(),
  });
}

/**
 * Reject cookies WITHOUT saving anything.
 * Clears localStorage and clears server-side consent (if authenticated).
 */
export async function rejectCookiesDontSave(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Remove local record
    localStorage.removeItem(COOKIE_CONSENT_KEY);

    // If authenticated, also clear server-side record
    const authenticated = await isAuthenticated();
    if (authenticated) {
      try {
        await fetch('/api/user/cookie-consent', {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch {
        // ignore
      }
    }
  } catch (error) {
    console.error('Error clearing cookie consent:', error);
  }
}

/**
 * Clear cookie consent (for testing or reset)
 */
export function clearCookieConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COOKIE_CONSENT_KEY);
}

/**
 * Check if a specific cookie category is allowed (synchronous check)
 */
export function isCookieCategoryAllowed(category: keyof Omit<CookieConsent, 'timestamp'>): boolean {
  const consent = getCookieConsentSync();
  if (!consent) return false;
  
  // Essential cookies are always allowed
  if (category === 'essential') return true;
  
  return consent[category] === true;
}

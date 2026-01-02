/**
 * Mobile-specific authentication helpers for Capacitor
 * Handles session persistence using Capacitor Preferences
 */

import { Preferences } from '@capacitor/preferences';

const SESSION_KEY = 'stylr_session';

/**
 * Check if running in Capacitor
 */
export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

/**
 * Save session to Capacitor Preferences
 */
export async function saveMobileSession(sessionData: { email: string; userId: string; name?: string | null }) {
  if (!isCapacitor()) return;

  try {
    await Preferences.set({
      key: SESSION_KEY,
      value: JSON.stringify({
        ...sessionData,
        timestamp: Date.now(),
      }),
    });
    console.log('✅ Mobile session saved to Preferences');
  } catch (error) {
    console.error('Error saving mobile session:', error);
  }
}

/**
 * Get session from Capacitor Preferences
 */
export async function getMobileSession(): Promise<{ email: string; userId: string; name?: string | null } | null> {
  if (!isCapacitor()) return null;

  try {
    const { value } = await Preferences.get({ key: SESSION_KEY });

    if (!value) {
      console.log('No mobile session found');
      return null;
    }

    const sessionData = JSON.parse(value);
    console.log('✅ Mobile session retrieved from Preferences');
    return sessionData;
  } catch (error) {
    console.error('Error getting mobile session:', error);
    return null;
  }
}

/**
 * Clear mobile session
 */
export async function clearMobileSession() {
  if (!isCapacitor()) return;

  try {
    await Preferences.remove({ key: SESSION_KEY });
    console.log('✅ Mobile session cleared');
  } catch (error) {
    console.error('Error clearing mobile session:', error);
  }
}

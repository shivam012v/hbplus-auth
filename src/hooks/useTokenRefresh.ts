/**
 * useTokenRefresh
 *
 * Keeps the Firebase ID token fresh for an authenticated user.
 *
 * ─── Why this matters ─────────────────────────────────────────────────────────
 * Firebase ID tokens expire after 60 minutes. Firebase Auth auto-refreshes them
 * silently in the background, but that refresh only happens when the SDK detects
 * the token is near expiry. If a user's account is disabled or their session is
 * revoked in the Firebase console, the client won't know until the next refresh.
 *
 * This hook:
 *   1. Forces a token refresh every 55 minutes (5 min before natural expiry)
 *      so the app always holds a valid token and revocations are detected quickly.
 *   2. Force-refreshes when the app comes back into focus (AppState: background →
 *      foreground) — a user might have been away for a long time.
 *   3. Never stores the token anywhere — it is only held in memory by Firebase's
 *      own SDK. We never write it to AsyncStorage, localStorage, or any log.
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 * Called once inside AuthProvider. Pass the current Firebase User (or null).
 * The hook is a no-op when user is null.
 */
import { User } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const REFRESH_INTERVAL_MS = 55 * 60 * 1000; // 55 minutes

export function useTokenRefresh(user: User | null): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Periodic refresh ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function refresh() {
      try {
        // forceRefresh = true bypasses the local cache and fetches a fresh
        // token from Firebase, catching revocations and account changes.
        await user!.getIdToken(/* forceRefresh */ true);
        console.debug('[useTokenRefresh] ID token refreshed');
      } catch (err) {
        // Token refresh failed — most likely the session was revoked.
        // onAuthStateChanged will fire with null shortly, which causes
        // App.tsx to redirect to the login screen automatically.
        console.warn('[useTokenRefresh] refresh failed:', err);
      }
    }

    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  // ── Focus refresh ───────────────────────────────────────────────────────────
  // When the app returns to the foreground after being backgrounded,
  // refresh immediately in case the token expired while idle.
  useEffect(() => {
    if (!user) return;

    async function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        try {
          await user!.getIdToken(true);
          console.debug('[useTokenRefresh] token refreshed on focus');
        } catch (err) {
          console.warn('[useTokenRefresh] focus refresh failed:', err);
        }
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [user]);
}

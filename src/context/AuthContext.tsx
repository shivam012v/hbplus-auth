/**
 * AuthContext
 *
 * Single shared auth state for the entire app.
 * useAuthState() runs exactly once inside AuthProvider — one listener,
 * one getRedirectResult call, no duplicate subscriptions.
 *
 * Also integrates useTokenRefresh so the ID token stays valid and
 * revocations are detected promptly.
 *
 * ─── Token security principles ────────────────────────────────────────────────
 * • ID tokens are held only in Firebase SDK memory — never written to
 *   AsyncStorage, localStorage, sessionStorage, or any log.
 * • browserLocalPersistence (set in firebase.ts) stores only the refresh
 *   token in IndexedDB — this is Firebase's own secure store, not ours.
 * • refreshToken() lets any component trigger a force-refresh on demand
 *   (e.g. before a sensitive API call).
 *
 * ─── Exposed values ───────────────────────────────────────────────────────────
 *   user           — validated Firebase User (@hbplus.fit only), or null
 *   loading        — true while initial session + redirect result resolve
 *   domainBlocked  — true after a domain-rejected sign-in attempt
 *   refreshToken() — force-refreshes the ID token; resolves with the new
 *                    token string or null if not signed in
 */
import React, {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react';
import { useAuthState, type AuthState } from '../hooks/useAuthState';
import { useTokenRefresh } from '../hooks/useTokenRefresh';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  /** Force-refreshes the Firebase ID token. Returns the new token or null. */
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();

  // Keep the ID token fresh. No-op when user is null.
  useTokenRefresh(authState.user);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!authState.user) return null;
    try {
      const token = await authState.user.getIdToken(/* forceRefresh */ true);
      console.debug('[AuthContext] token refreshed on demand');
      return token;
    } catch (err) {
      console.warn('[AuthContext] refreshToken failed:', err);
      return null;
    }
  }, [authState.user]);

  return (
    <AuthContext.Provider value={{ ...authState, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth() must be called inside <AuthProvider>');
  }
  return ctx;
}

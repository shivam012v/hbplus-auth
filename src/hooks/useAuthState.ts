/**
 * useAuthState
 *
 * Single source of truth for Firebase auth state.
 * Called only once, inside AuthProvider (AuthContext.tsx).
 * Every component reads state through useAuth() — never calls this directly.
 *
 * ─── How Google auth works in this project ───────────────────────────────────
 * We use signInWithRedirect (not signInWithPopup) because Expo's Metro dev
 * server sends Cross-Origin-Opener-Policy: same-origin, which severs the
 * opener reference so Firebase's popup flow always throws
 * auth/popup-closed-by-user before the credential arrives.
 *
 * Redirect flow:
 *   1. User clicks "Continue with Google"
 *   2. signInWithRedirect navigates the tab to Google's sign-in page
 *   3. Google redirects back to localhost:8081
 *   4. On the reloaded page this hook calls getRedirectResult(auth)
 *   5. Firebase retrieves the credential from sessionStorage, stores the
 *      session in IndexedDB (browserLocalPersistence), then fires
 *      onAuthStateChanged with the authenticated user
 *   6. Domain check runs — @hbplus.fit passes, anything else is signed out
 *
 * ─── loading gate ─────────────────────────────────────────────────────────────
 * loading stays true until BOTH:
 *   • onAuthStateChanged has fired at least once  (authDoneRef)
 *   • getRedirectResult has settled               (redirectDoneRef)
 *
 * Without this gate the login screen flashes on the redirect return because
 * onAuthStateChanged(null) fires before getRedirectResult processes the
 * credential and triggers the second onAuthStateChanged(user) call.
 */
import {
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { auth } from '../services/firebase';
import { validateEmailDomain } from '../utils/validateEmailDomain';

export interface AuthState {
  user: User | null;
  loading: boolean;
  domainBlocked: boolean;
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    domainBlocked: false,
  });

  const mountedRef       = useRef(true);
  const signingOutRef    = useRef(false);  // prevents double signOut on domain rejection
  const authDoneRef      = useRef(false);  // onAuthStateChanged has fired at least once
  const redirectDoneRef  = useRef(false);  // getRedirectResult has settled

  useEffect(() => {
    mountedRef.current      = true;
    authDoneRef.current     = false;
    redirectDoneRef.current = false;

    // Lower loading only after BOTH callbacks have settled.
    function maybeUnlock() {
      if (authDoneRef.current && redirectDoneRef.current && mountedRef.current) {
        setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      }
    }

    // ── onAuthStateChanged ────────────────────────────────────────────────────
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!mountedRef.current) return;

        if (!firebaseUser) {
          // No active session.
          authDoneRef.current = true;
          setState((prev) => ({
            user: null,
            // Keep loading true if redirect hasn't settled yet.
            loading: !redirectDoneRef.current,
            domainBlocked: signingOutRef.current ? prev.domainBlocked : false,
          }));
          signingOutRef.current = false;
          maybeUnlock();
          return;
        }

        const email = (firebaseUser.email ?? '').trim().toLowerCase();

        // Domain check ─────────────────────────────────────────────────────────
        if (!validateEmailDomain(email)) {
          console.debug('[useAuthState] domain rejected:', email || '(no email)');
          authDoneRef.current   = true;
          signingOutRef.current = true;
          if (mountedRef.current) {
            setState({ user: null, loading: false, domainBlocked: true });
          }
          try {
            await signOut(auth);
          } catch (e) {
            console.error('[useAuthState] signOut failed:', e);
            signingOutRef.current = false;
          }
          return;
        }

        // Authorised ───────────────────────────────────────────────────────────
        console.debug('[useAuthState] authorised:', email);
        authDoneRef.current = true;
        if (mountedRef.current) {
          setState({ user: firebaseUser, loading: false, domainBlocked: false });
        }
      },
      (error) => {
        console.error('[useAuthState] onAuthStateChanged error:', error);
        authDoneRef.current   = true;
        signingOutRef.current = false;
        if (mountedRef.current) {
          setState({ user: null, loading: false, domainBlocked: false });
        }
        maybeUnlock();
      },
    );

    // ── getRedirectResult ─────────────────────────────────────────────────────
    // Retrieves the OAuth credential left in sessionStorage by signInWithRedirect.
    // Returns null when there is no pending redirect (normal page load).
    // When a credential is found Firebase stores the session and fires
    // onAuthStateChanged with the real user — we only log here.
    getRedirectResult(auth)
      .then((result) => {
        redirectDoneRef.current = true;
        if (result) {
          console.debug(
            '[useAuthState] getRedirectResult resolved for:',
            result.user.email,
          );
        } else {
          console.debug('[useAuthState] getRedirectResult: no pending redirect');
        }
        maybeUnlock();
      })
      .catch((err: unknown) => {
        redirectDoneRef.current = true;
        const e = err as { code?: string; message?: string };
        console.warn(
          '[useAuthState] getRedirectResult error:',
          e?.code ?? 'unknown',
          e?.message ?? String(err),
        );
        maybeUnlock();
      });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return state;
}

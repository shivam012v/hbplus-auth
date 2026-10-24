/**
 * firebase.ts — Firebase app + auth initialisation
 *
 * Uses initializeAuth instead of getAuth so we can explicitly supply:
 *
 *   browserLocalPersistence   — stores the session in IndexedDB/localStorage,
 *                               survives page reloads (required for redirect
 *                               flow to restore the user after returning from
 *                               Google's sign-in page).
 *
 *   browserPopupRedirectResolver — tells Firebase which mechanism to use for
 *                               both signInWithPopup AND signInWithRedirect.
 *                               Passing it here once means every call to
 *                               signInWithPopup / signInWithRedirect /
 *                               getRedirectResult automatically uses it —
 *                               no need to pass it at each call site.
 *
 * getAuth() alone does not guarantee these settings in Firebase v13, which
 * is why the redirect flow silently returned null from getRedirectResult.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialise the Firebase app once (safe for hot-reload).
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialise Auth with explicit persistence + resolver.
// initializeAuth throws if called twice on the same app, so we fall back to
// getAuth() when the instance already exists (e.g. during React hot-reload).
let auth: ReturnType<typeof initializeAuth>;
try {
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  // Already initialised — retrieve the existing instance.
  auth = getAuth(app) as ReturnType<typeof initializeAuth>;
}

export { auth };

// Google provider — request the user's email explicitly.
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

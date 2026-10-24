/**
 * LoginScreen
 *
 * Owns all authentication logic and passes it to the presentational AuthCard.
 *
 * ─── Auth flows ───────────────────────────────────────────────────────────────
 *  1. Email / Password sign-in  → signInWithEmailAndPassword
 *  2. Email / Password sign-up  → createUserWithEmailAndPassword
 *  3. Password reset            → sendPasswordResetEmail
 *  4. Google sign-in/sign-up    → signInWithRedirect (web)
 *                                 @react-native-google-signin (native — TODO)
 *
 * ─── Domain enforcement ───────────────────────────────────────────────────────
 *  • Email flows: validated client-side before calling Firebase.
 *  • Google flow: useAuthState handles it in onAuthStateChanged after the
 *    redirect returns. LoginScreen reads domainBlocked from AuthContext.
 *
 * ─── Why signInWithRedirect ───────────────────────────────────────────────────
 * Expo's Metro server sends COOP: same-origin which breaks signInWithPopup
 * (window.closed is always true → auth/popup-closed-by-user before the
 * credential arrives). signInWithRedirect navigates the tab to Google and
 * back — no cross-window messaging, unaffected by COOP.
 */
import { StatusBar } from 'expo-status-bar';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  AuthErrorCodes,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import React, { useCallback, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native';

import AuthCard, {
  type AuthMode,
  type SignInFields,
  type SignUpFields,
  type ResetFields,
  type StatusMessage,
} from '../components/AuthCard';
import BackgroundVideo from '../components/BackgroundVideo';
import { auth, googleProvider } from '../services/firebase';
import {
  validateEmailDomain,
  DOMAIN_ERROR_MESSAGE,
  AUTHORISED_DOMAIN,
} from '../utils/validateEmailDomain';
import { getAuthErrorMessage } from '../utils/authErrors';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function fbErrMsg(err: FirebaseError): StatusMessage | null {
  const text = getAuthErrorMessage(err.code);
  if (!text) return null;
  return { kind: 'error', text };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  // domainBlocked comes from the single shared AuthContext instance.
  const { domainBlocked } = useAuth();

  const [mode,    setMode]    = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  // domainBlocked takes priority over any local message.
  const displayMessage: StatusMessage | null = domainBlocked
    ? { kind: 'error', text: DOMAIN_ERROR_MESSAGE }
    : message;

  // While the hook is processing a domain rejection, clear our spinner too.
  const effectiveLoading = loading && !domainBlocked;

  // ── Field state ────────────────────────────────────────────────────────────
  const [signInFields, setSignInFields] = useState<SignInFields>({ email: '', password: '' });
  const [signInErrors, setSignInErrors] = useState<Partial<SignInFields>>({});

  const [signUpFields, setSignUpFields] = useState<SignUpFields>({
    fullName: '', email: '', password: '', confirmPassword: '',
  });
  const [signUpErrors, setSignUpErrors] = useState<Partial<SignUpFields>>({});

  const [resetFields, setResetFields] = useState<ResetFields>({ email: '' });
  const [resetErrors, setResetErrors] = useState<Partial<ResetFields>>({});

  // ── Mode switch ────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((m: AuthMode) => {
    setMode(m);
    setMessage(null);
    setSignInErrors({});
    setSignUpErrors({});
    setResetErrors({});
  }, []);

  // ── Email sign-in ──────────────────────────────────────────────────────────
  const handleEmailSignIn = useCallback(async () => {
    if (loading) return;
    const email = signInFields.email.trim().toLowerCase();
    const errs: Partial<SignInFields> = {};

    if (!email)                     errs.email    = 'Email is required.';
    else if (!isValidEmail(email))  errs.email    = 'Please enter a valid email address.';
    else if (!validateEmailDomain(email))
                                    errs.email    = `Only ${AUTHORISED_DOMAIN} addresses are permitted.`;
    if (!signInFields.password)     errs.password = 'Password is required.';

    if (Object.keys(errs).length) { setSignInErrors(errs); return; }
    setSignInErrors({});
    setMessage(null);
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, signInFields.password);
      if (!validateEmailDomain(result.user.email?.trim().toLowerCase())) {
        await signOut(auth);
        setLoading(false);
        setMessage({ kind: 'error', text: DOMAIN_ERROR_MESSAGE });
        return;
      }
      setLoading(false);
      // onAuthStateChanged fires → AuthContext updates → App.tsx navigates.
    } catch (err) {
      setLoading(false);
      if (err instanceof FirebaseError) {
        console.debug('[LoginScreen] email sign-in:', err.code, err.message);
        const m = fbErrMsg(err); if (m) setMessage(m);
      } else {
        setMessage({ kind: 'error', text: 'An unexpected error occurred. Please try again.' });
      }
    }
  }, [loading, signInFields]);

  // ── Email sign-up ──────────────────────────────────────────────────────────
  const handleEmailSignUp = useCallback(async () => {
    if (loading) return;
    const email = signUpFields.email.trim().toLowerCase();
    const name  = signUpFields.fullName.trim();
    const errs: Partial<SignUpFields> = {};

    if (!name)                       errs.fullName        = 'Full name is required.';
    if (!email)                      errs.email           = 'Email is required.';
    else if (!isValidEmail(email))   errs.email           = 'Please enter a valid email address.';
    else if (!validateEmailDomain(email))
                                     errs.email           = DOMAIN_ERROR_MESSAGE;
    if (!signUpFields.password)                       errs.password = 'Password is required.';
    else if (signUpFields.password.length < 8)        errs.password = 'Password must be at least 8 characters.';
    if (!signUpFields.confirmPassword)                errs.confirmPassword = 'Please confirm your password.';
    else if (signUpFields.password !== signUpFields.confirmPassword)
                                                      errs.confirmPassword = 'Passwords do not match.';

    if (Object.keys(errs).length) { setSignUpErrors(errs); return; }
    setSignUpErrors({});
    setMessage(null);
    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(auth, email, signUpFields.password);
      if (name) await updateProfile(result.user, { displayName: name });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (err instanceof FirebaseError) {
        console.debug('[LoginScreen] email sign-up:', err.code, err.message);
        const m = fbErrMsg(err); if (m) setMessage(m);
      } else {
        setMessage({ kind: 'error', text: 'An unexpected error occurred. Please try again.' });
      }
    }
  }, [loading, signUpFields]);

  // ── Password reset ─────────────────────────────────────────────────────────
  const handlePasswordReset = useCallback(async () => {
    if (loading) return;
    const email = resetFields.email.trim().toLowerCase();
    const errs: Partial<ResetFields> = {};

    if (!email)                    errs.email = 'Email is required.';
    else if (!isValidEmail(email)) errs.email = 'Please enter a valid email address.';
    else if (!validateEmailDomain(email))
                                   errs.email = `Only ${AUTHORISED_DOMAIN} addresses are permitted.`;

    if (Object.keys(errs).length) { setResetErrors(errs); return; }
    setResetErrors({});
    setMessage(null);
    setLoading(true);

    const successMsg = `If ${email} is registered, a reset link has been sent. Check your inbox.`;
    try {
      await sendPasswordResetEmail(auth, email);
      setLoading(false);
      setMessage({ kind: 'success', text: successMsg });
    } catch (err) {
      setLoading(false);
      if (
        err instanceof FirebaseError &&
        (err.code === 'auth/user-not-found' || err.code === AuthErrorCodes.USER_DELETED)
      ) {
        // Anti-enumeration: same message whether the account exists or not.
        setMessage({ kind: 'success', text: successMsg });
        return;
      }
      if (err instanceof FirebaseError) {
        console.debug('[LoginScreen] password reset:', err.code, err.message);
        const m = fbErrMsg(err); if (m) setMessage(m);
      } else {
        setMessage({ kind: 'error', text: 'An unexpected error occurred. Please try again.' });
      }
    }
  }, [loading, resetFields]);

  // ── Google sign-in / sign-up ───────────────────────────────────────────────
  // Uses signInWithRedirect — works on both sign-in and sign-up tabs.
  // Firebase creates the account automatically on first sign-in with Google.
  //
  // Flow:
  //   click → setLoading(true) → page navigates to Google →
  //   Google redirects back → useAuthState.getRedirectResult picks up the
  //   credential → onAuthStateChanged fires → domain check → dashboard or error
  //
  // TODO (native): replace with @react-native-google-signin/google-signin
  //   + signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
  const handleGooglePress = useCallback(async () => {
    if (loading) return;

    if (Platform.OS !== 'web') {
      setMessage({
        kind: 'info',
        text: 'Native Google Sign-In requires additional configuration.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      console.debug('[LoginScreen] starting Google redirect…');
      await signInWithRedirect(auth, googleProvider);
      // Page navigates away here — nothing below runs.
    } catch (err) {
      setLoading(false);
      if (err instanceof FirebaseError) {
        console.debug('[LoginScreen] Google redirect error:', err.code, err.message);
        const m = fbErrMsg(err); if (m) setMessage(m);
      } else {
        setMessage({ kind: 'error', text: 'An unexpected error occurred. Please try again.' });
      }
    }
  }, [loading]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <BackgroundVideo />
      <SafeAreaView style={s.safe}>
        <AuthCard
          mode={mode}
          onModeChange={handleModeChange}

          signInFields={signInFields}
          onSignInChange={(f) => setSignInFields((p) => ({ ...p, ...f }))}
          signInErrors={signInErrors}

          signUpFields={signUpFields}
          onSignUpChange={(f) => setSignUpFields((p) => ({ ...p, ...f }))}
          signUpErrors={signUpErrors}

          resetFields={resetFields}
          onResetChange={(f) => setResetFields((p) => ({ ...p, ...f }))}
          resetErrors={resetErrors}

          onEmailSignIn={handleEmailSignIn}
          onEmailSignUp={handleEmailSignUp}
          onPasswordReset={handlePasswordReset}
          onGooglePress={handleGooglePress}

          loading={effectiveLoading}
          message={displayMessage}
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
});

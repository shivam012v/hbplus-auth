/**
 * AuthCard
 *
 * Dark glassmorphism authentication card.
 *
 * Modes:
 *   signin   — email + password fields, "Forgot password?", email button,
 *              separator, Google button.
 *   signup   — full name, email, password, confirm-password, email button,
 *              separator, Google button.
 *   reset    — single email field, "Send reset link" button, back link.
 *
 * All state is lifted to LoginScreen; this component is purely presentational.
 * Auth logic lives entirely in LoginScreen.tsx.
 */
import React, { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import GoogleSignInButton from './GoogleSignInButton';
import TextInputField from './TextInputField';
import { AUTHORISED_DOMAIN } from '../utils/validateEmailDomain';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AuthMode = 'signin' | 'signup' | 'reset';
export type MessageKind = 'error' | 'info' | 'success';

export interface StatusMessage {
  kind: MessageKind;
  text: string;
}

export interface SignInFields {
  email: string;
  password: string;
}

export interface SignUpFields {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ResetFields {
  email: string;
}

interface AuthCardProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;

  // Email / password fields — controlled by LoginScreen
  signInFields: SignInFields;
  onSignInChange: (f: Partial<SignInFields>) => void;
  signInErrors: Partial<SignInFields>;

  signUpFields: SignUpFields;
  onSignUpChange: (f: Partial<SignUpFields>) => void;
  signUpErrors: Partial<SignUpFields>;

  resetFields: ResetFields;
  onResetChange: (f: Partial<ResetFields>) => void;
  resetErrors: Partial<ResetFields>;

  // Handlers
  onEmailSignIn: () => void;
  onEmailSignUp: () => void;
  onPasswordReset: () => void;
  onGooglePress: () => void;

  loading: boolean;
  message: StatusMessage | null;
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  cardBg: 'rgba(10, 10, 30, 0.72)',
  cardBorder: 'rgba(255,255,255,0.10)',
  segBg: 'rgba(255,255,255,0.06)',
  segActive: 'rgba(255,255,255,0.14)',
  segActiveBorder: 'rgba(255,255,255,0.28)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.38)',
  brand: '#FFFFFF',
  brandAccent: '#3B82F6',
  divider: 'rgba(255,255,255,0.10)',
  noticeBg: 'rgba(255,255,255,0.04)',
  noticeBorder: 'rgba(255,255,255,0.08)',
  errorBg: 'rgba(220,38,38,0.18)',
  errorBorder: 'rgba(248,113,113,0.40)',
  errorText: '#FCA5A5',
  infoBg: 'rgba(59,130,246,0.18)',
  infoBorder: 'rgba(96,165,250,0.40)',
  infoText: '#93C5FD',
  successBg: 'rgba(34,197,94,0.15)',
  successBorder: 'rgba(74,222,128,0.35)',
  successText: '#86EFAC',
  primaryBtn: '#2563EB',
  primaryBtnPressed: '#1D4ED8',
  primaryBtnDisabled: 'rgba(37,99,235,0.45)',
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (m: AuthMode) => void;
}) {
  // Only show Sign in / Sign up in the segmented control.
  // Reset mode is accessed via "Forgot password?" and not a tab.
  const tabs: { id: AuthMode; label: string }[] = [
    { id: 'signin', label: 'Sign in' },
    { id: 'signup', label: 'Sign up' },
  ];
  const activeTab = mode === 'reset' ? 'signin' : mode;

  return (
    <View style={seg.container} accessibilityRole="tablist">
      {tabs.map(({ id, label }) => {
        const active = activeTab === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              seg.tab,
              active && seg.tabActive,
              pressed && !active && seg.tabPressed,
            ]}
          >
            <Text style={[seg.label, active && seg.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: C.segBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 3,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: C.segActive,
    borderWidth: 1,
    borderColor: C.segActiveBorder,
  },
  tabPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
    letterSpacing: 0.2,
  },
  labelActive: { color: C.textPrimary, fontWeight: '700' },
});

function Divider({ label }: { label?: string }) {
  return (
    <View style={div.row}>
      <View style={div.line} />
      {label ? <Text style={div.text}>{label}</Text> : null}
      {label ? <View style={div.line} /> : null}
    </View>
  );
}

const div = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  line: { flex: 1, height: 1, backgroundColor: C.divider },
  text: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 1.2,
  },
});

function StatusBox({ message }: { message: StatusMessage }) {
  const map = {
    error:   { bg: C.errorBg,   border: C.errorBorder,   color: C.errorText   },
    info:    { bg: C.infoBg,    border: C.infoBorder,    color: C.infoText    },
    success: { bg: C.successBg, border: C.successBorder, color: C.successText },
  } as const;
  const t = map[message.kind];
  return (
    <View
      style={[msg.box, { backgroundColor: t.bg, borderColor: t.border }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={[msg.text, { color: t.color }]}>{message.text}</Text>
    </View>
  );
}

const msg = StyleSheet.create({
  box: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14,
  },
  text: { fontSize: 13, lineHeight: 19, textAlign: 'center', fontWeight: '500' },
});

function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading || disabled }}
      style={({ pressed }) => [
        pb.btn,
        pressed && !loading && pb.pressed,
        (loading || disabled) && pb.disabled,
      ]}
    >
      <Text style={pb.label}>{loading ? 'Please wait…' : label}</Text>
    </Pressable>
  );
}

const pb = StyleSheet.create({
  btn: {
    backgroundColor: C.primaryBtn,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
    elevation: 6,
  },
  pressed: { backgroundColor: C.primaryBtnPressed },
  disabled: { backgroundColor: C.primaryBtnDisabled, shadowOpacity: 0 },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ─── Sign-in form ─────────────────────────────────────────────────────────────
function SignInForm({
  fields,
  errors,
  onChange,
  onSubmit,
  onForgot,
  onGooglePress,
  loading,
}: {
  fields: SignInFields;
  errors: Partial<SignInFields>;
  onChange: (f: Partial<SignInFields>) => void;
  onSubmit: () => void;
  onForgot: () => void;
  onGooglePress: () => void;
  loading: boolean;
}) {
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  return (
    <>
      <TextInputField
        label="Work Email"
        placeholder="you@hbplus.fit"
        value={fields.email}
        onChangeText={(v) => onChange({ email: v })}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <TextInputField
        ref={passwordRef}
        label="Password"
        placeholder="Enter your password"
        value={fields.password}
        onChangeText={(v) => onChange({ password: v })}
        error={errors.password}
        isPassword
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      {/* Forgot password link */}
      <Pressable
        onPress={onForgot}
        accessibilityRole="button"
        accessibilityLabel="Forgot password"
        style={({ pressed }) => [link.wrapper, pressed && link.pressed]}
      >
        <Text style={link.text}>Forgot password?</Text>
      </Pressable>

      <PrimaryButton
        label="Sign in with email"
        onPress={onSubmit}
        loading={loading}
      />

      <Divider label="OR CONTINUE WITH" />

      <GoogleSignInButton
        onPress={onGooglePress}
        loading={false}
        label="Continue with Google"
      />
    </>
  );
}

// ─── Sign-up form ─────────────────────────────────────────────────────────────
function SignUpForm({
  fields,
  errors,
  onChange,
  onSubmit,
  onGooglePress,
  loading,
}: {
  fields: SignUpFields;
  errors: Partial<SignUpFields>;
  onChange: (f: Partial<SignUpFields>) => void;
  onSubmit: () => void;
  onGooglePress: () => void;
  loading: boolean;
}) {
  const emailRef    = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmRef  = useRef<React.ElementRef<typeof TextInput>>(null);

  return (
    <>
      <TextInputField
        label="Full Name"
        placeholder="Your full name"
        value={fields.fullName}
        onChangeText={(v) => onChange({ fullName: v })}
        error={errors.fullName}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      <TextInputField
        ref={emailRef}
        label="Work Email"
        placeholder="you@hbplus.fit"
        value={fields.email}
        onChangeText={(v) => onChange({ email: v })}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <TextInputField
        ref={passwordRef}
        label="Password"
        placeholder="Min. 8 characters"
        value={fields.password}
        onChangeText={(v) => onChange({ password: v })}
        error={errors.password}
        isPassword
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />

      {/* Password requirements hint */}
      <Text style={hint.text}>
        Must be at least 8 characters. Use a mix of letters, numbers and
        symbols for a stronger password.
      </Text>

      <TextInputField
        ref={confirmRef}
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={fields.confirmPassword}
        onChangeText={(v) => onChange({ confirmPassword: v })}
        error={errors.confirmPassword}
        isPassword
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <PrimaryButton
        label="Create account"
        onPress={onSubmit}
        loading={loading}
      />

      <Divider label="OR CONTINUE WITH" />

      <GoogleSignInButton
        onPress={onGooglePress}
        loading={false}
        label="Sign up with Google"
      />
    </>
  );
}

const hint = StyleSheet.create({
  text: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17,
    marginTop: -6,
    marginBottom: 14,
  },
});

// ─── Password reset form ──────────────────────────────────────────────────────
function ResetForm({
  fields,
  errors,
  onChange,
  onSubmit,
  onBack,
  loading,
}: {
  fields: ResetFields;
  errors: Partial<ResetFields>;
  onChange: (f: Partial<ResetFields>) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <>
      <Text style={reset.subtitle}>
        Enter your work email and we{"'"}ll send you a link to reset your password.
      </Text>

      <TextInputField
        label="Work Email"
        placeholder="you@hbplus.fit"
        value={fields.email}
        onChangeText={(v) => onChange({ email: v })}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <PrimaryButton
        label="Send reset link"
        onPress={onSubmit}
        loading={loading}
      />

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to sign in"
        style={({ pressed }) => [link.wrapper, link.center, pressed && link.pressed]}
      >
        <Text style={link.text}>← Back to sign in</Text>
      </Pressable>
    </>
  );
}

const reset = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
});

const link = StyleSheet.create({
  wrapper: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  center: { alignSelf: 'center', marginTop: 16, marginBottom: 0 },
  pressed: { opacity: 0.6 },
  text: { fontSize: 13, color: C.brandAccent, fontWeight: '600' },
});

// ─── Main card ────────────────────────────────────────────────────────────────
export default function AuthCard({
  mode,
  onModeChange,
  signInFields,
  onSignInChange,
  signInErrors,
  signUpFields,
  onSignUpChange,
  signUpErrors,
  resetFields,
  onResetChange,
  resetErrors,
  onEmailSignIn,
  onEmailSignUp,
  onPasswordReset,
  onGooglePress,
  loading,
  message,
}: AuthCardProps) {
  const headings = {
    signin: 'Welcome back',
    signup: 'Create an account',
    reset:  'Reset password',
  };

  return (
    <ScrollView
      contentContainerStyle={card.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={card.surface}>

        {/* Brand */}
        <View style={card.brandRow}>
          <Text style={card.brandText}>
            HB<Text style={card.brandPlus}>+</Text>
          </Text>
        </View>

        {/* Mode tabs — hidden in reset mode */}
        {mode !== 'reset' && (
          <ModeSwitch mode={mode} onChange={onModeChange} />
        )}

        {/* Heading */}
        <Text style={card.heading} accessibilityRole="header">
          {headings[mode]}
        </Text>

        {/* Status message */}
        {message && <StatusBox message={message} />}

        {/* Spacer between message and first field */}
        {message && <View style={{ height: 14 }} />}

        {/* Form content */}
        {mode === 'signin' && (
          <SignInForm
            fields={signInFields}
            errors={signInErrors}
            onChange={onSignInChange}
            onSubmit={onEmailSignIn}
            onForgot={() => onModeChange('reset')}
            onGooglePress={onGooglePress}
            loading={loading}
          />
        )}

        {mode === 'signup' && (
          <SignUpForm
            fields={signUpFields}
            errors={signUpErrors}
            onChange={onSignUpChange}
            onSubmit={onEmailSignUp}
            onGooglePress={onGooglePress}
            loading={loading}
          />
        )}

        {mode === 'reset' && (
          <ResetForm
            fields={resetFields}
            errors={resetErrors}
            onChange={onResetChange}
            onSubmit={onPasswordReset}
            onBack={() => onModeChange('signin')}
            loading={loading}
          />
        )}

        {/* Domain restriction notice */}
        {mode !== 'reset' && (
          <View style={card.notice}>
            <Text style={card.noticeText}>
              🔒{'  '}Access is restricted to authorized{' '}
              <Text style={card.accentText}>{AUTHORISED_DOMAIN}</Text> accounts.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const card = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  surface: {
    width: '100%',
    // @ts-ignore — maxWidth valid on RN 0.71+ and RN Web
    maxWidth: 420,
    backgroundColor: C.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 28,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
    // @ts-ignore
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  },
  brandRow: { alignItems: 'center', marginBottom: 22 },
  brandText: {
    fontSize: 32,
    fontWeight: '900',
    color: C.brand,
    letterSpacing: -0.5,
  },
  brandPlus: { color: C.brandAccent },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  notice: {
    marginTop: 20,
    backgroundColor: C.noticeBg,
    borderWidth: 1,
    borderColor: C.noticeBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  noticeText: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  accentText: { color: C.brandAccent, fontWeight: '600' },
});

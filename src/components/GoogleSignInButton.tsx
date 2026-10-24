/**
 * GoogleSignInButton
 *
 * A polished, accessible, full-width button that matches Google's own
 * sign-in button guidelines while fitting the dark glassmorphism card theme.
 *
 * The `onPress` prop is intentionally kept generic so the caller (AuthCard /
 * LoginScreen) can attach any auth implementation — Firebase, OAuth session,
 * or the pending-configuration stub — without touching this component.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── Props ────────────────────────────────────────────────────────────────────
interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
}

// ─── Google colour palette (official brand colours) ───────────────────────────
const G_BLUE = '#4285F4';
const G_RED = '#EA4335';
const G_YELLOW = '#FBBC05';
const G_GREEN = '#34A853';

// ─── Four-colour "G" icon ─────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <View style={icon.wrapper} accessibilityElementsHidden>
      {/* Top-right blue arc  */}
      <View style={[icon.segment, icon.tl, { backgroundColor: G_BLUE }]} />
      {/* Top-left red arc */}
      <View style={[icon.segment, icon.tr, { backgroundColor: G_RED }]} />
      {/* Bottom-left yellow arc */}
      <View style={[icon.segment, icon.bl, { backgroundColor: G_YELLOW }]} />
      {/* Bottom-right green arc */}
      <View style={[icon.segment, icon.br, { backgroundColor: G_GREEN }]} />
      {/* White centre cutout — produces the letterform illusion */}
      <View style={icon.centre} />
      {/* White horizontal bar (the crossbar of the G) */}
      <View style={icon.bar} />
    </View>
  );
}

const ICON_SIZE = 22;
const HALF = ICON_SIZE / 2;
const QUARTER = ICON_SIZE / 4;

const icon = StyleSheet.create({
  wrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: HALF,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  segment: {
    position: 'absolute',
    width: HALF,
    height: HALF,
  },
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
  centre: {
    position: 'absolute',
    width: HALF + 2,
    height: HALF + 2,
    borderRadius: (HALF + 2) / 2,
    backgroundColor: '#1a1a2e',   // matches card background so it looks cut-out
    top: QUARTER - 1,
    left: QUARTER - 1,
  },
  bar: {
    position: 'absolute',
    width: QUARTER + 2,
    height: 4,
    backgroundColor: '#1a1a2e',
    right: 0,
    top: HALF - 2,
  },
});

// ─── Button ───────────────────────────────────────────────────────────────────
export default function GoogleSignInButton({
  onPress,
  loading = false,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Signs you in using your authorised company Google account"
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        btn.base,
        pressed && btn.pressed,
        // @ts-ignore — hovered is a web-only prop exposed by RN Web
        hovered && btn.hovered,
        loading && btn.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 12 }} />
      ) : (
        <GoogleIcon />
      )}
      <Text style={btn.label}>{loading ? 'Connecting…' : label}</Text>
    </Pressable>
  );
}

const btn = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Android
    elevation: 4,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.30)',
  },
  hovered: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

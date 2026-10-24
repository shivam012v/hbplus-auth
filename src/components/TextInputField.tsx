/**
 * TextInputField
 *
 * Reusable dark-glassmorphism text input matching the HB+ auth card design.
 *
 * Features:
 *  - Label rendered above the field.
 *  - Optional show/hide password toggle (eye icon).
 *  - Inline error message rendered below the field.
 *  - Focus ring (accent border) on focus.
 *  - Full accessibility: accessibilityLabel, accessibilityHint, returnKeyType.
 *  - Forwards ref so parent can call .focus() for keyboard flow.
 */
import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

// ─── Design tokens (kept in sync with AuthCard) ───────────────────────────────
const C = {
  inputBg: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputBorderFocus: 'rgba(59,130,246,0.70)',
  inputBorderError: 'rgba(248,113,113,0.70)',
  inputText: '#FFFFFF',
  inputPlaceholder: 'rgba(255,255,255,0.30)',
  labelText: 'rgba(255,255,255,0.70)',
  errorText: '#FCA5A5',
  toggleIcon: 'rgba(255,255,255,0.45)',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TextInputFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  /** Show the show/hide toggle. Set to true for password fields. */
  isPassword?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
const TextInputField = forwardRef<React.ElementRef<typeof TextInput>, TextInputFieldProps>(
  function TextInputField({ label, error, isPassword = false, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);

    const hasError = Boolean(error);

    return (
      <View style={styles.wrapper}>
        {/* Label */}
        <Text style={styles.label} accessibilityElementsHidden>
          {label}
        </Text>

        {/* Input row */}
        <View
          style={[
            styles.row,
            focused && styles.rowFocused,
            hasError && styles.rowError,
          ]}
        >
          <TextInput
            ref={ref}
            {...rest}
            secureTextEntry={isPassword && !visible}
            placeholderTextColor={C.inputPlaceholder}
            style={styles.input}
            accessibilityLabel={label}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
          />

          {/* Show/hide toggle — only rendered for password fields */}
          {isPassword && (
            <Pressable
              onPress={() => setVisible((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Hide password' : 'Show password'}
              hitSlop={8}
              style={styles.toggle}
            >
              <Text style={styles.toggleIcon}>{visible ? '🙈' : '👁'}</Text>
            </Pressable>
          )}
        </View>

        {/* Inline error */}
        {hasError && (
          <Text
            style={styles.error}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}
      </View>
    );
  },
);

export default TextInputField;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.labelText,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  rowFocused: {
    borderColor: C.inputBorderFocus,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  rowError: {
    borderColor: C.inputBorderError,
    backgroundColor: 'rgba(220,38,38,0.06)',
  },
  input: {
    flex: 1,
    color: C.inputText,
    fontSize: 15,
    // Remove default outline on web
    // @ts-ignore
    outlineStyle: 'none',
  },
  toggle: {
    paddingLeft: 10,
    paddingVertical: 6,
  },
  toggleIcon: {
    fontSize: 16,
    color: C.toggleIcon,
  },
  error: {
    fontSize: 12,
    color: C.errorText,
    marginTop: 5,
    lineHeight: 17,
  },
});

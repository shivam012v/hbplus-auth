/**
 * authErrors.ts
 *
 * Maps Firebase Authentication error codes to concise, user-friendly messages.
 *
 * Rules:
 *  - Never expose internal implementation details.
 *  - Never reveal whether an email exists in the system (account enumeration).
 *  - Popup/cancellation codes are returned as null so callers can stay silent.
 */

/** Returns null for errors the caller should silently ignore. */
export function getAuthErrorMessage(code: string): string | null {
  switch (code) {
    // ── Silently ignored ────────────────────────────────────────────────────
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;

    // ── Email / password ────────────────────────────────────────────────────
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';

    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.';

    // Use a generic message for both — prevents account enumeration.
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';

    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';

    case 'auth/weak-password':
      return 'Password must be at least 8 characters long.';

    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this action.';

    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';

    // ── Google popup ────────────────────────────────────────────────────────
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';

    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Contact your administrator.';

    // ── Network ─────────────────────────────────────────────────────────────
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';

    // ── Password reset ───────────────────────────────────────────────────────
    // Do NOT use a specific message for auth/user-not-found on reset —
    // we always show the same success-style message to avoid enumeration.
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'This reset link has expired or already been used. Please request a new one.';

    // ── Catch-all ────────────────────────────────────────────────────────────
    default:
      return `Sign-in failed. Please try again. (${code})`;
  }
}

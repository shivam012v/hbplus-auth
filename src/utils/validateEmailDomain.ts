/**
 * Validates that an email address belongs to the authorised HB+ domain.
 *
 * Rules:
 *  - Must be a non-empty string.
 *  - Must contain exactly one "@" character.
 *  - The domain part must equal "hbplus.fit" (case-insensitive).
 */
export function validateEmailDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return parts[1] === 'hbplus.fit';
}

/** The canonical error message shown to the user on domain rejection. */
export const DOMAIN_ERROR_MESSAGE =
  'Access restricted. Please login using your official domain email.';

/** The authorised domain, kept in one place for easy future changes. */
export const AUTHORISED_DOMAIN = '@hbplus.fit';

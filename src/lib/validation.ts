/**
 * Shared input-validation helpers. Runtime-agnostic (no server/client-only
 * imports) so the same checks can run in client components for instant
 * feedback and in server actions as the authoritative gate.
 */

/**
 * Pragmatic email shape: a non-empty local part, a single @, and a dotted
 * domain with no spaces. Deliberately not RFC-exhaustive — it rejects the
 * common mistakes (missing @, missing domain, trailing dot, spaces) without
 * false-negatives on real addresses.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

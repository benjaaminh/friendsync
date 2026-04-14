import crypto from "crypto";

const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:";

/**
 * Generates a URL-safe token for password reset links.
 */
export function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a raw reset token before persisting or looking up in the database.
 */
export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Builds the identifier value used in VerificationToken records for password resets.
 */
export function getPasswordResetIdentifier(userId: string) {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${userId}`;
}

/**
 * Parses a password reset identifier and returns the user id, or null when invalid.
 */
export function parsePasswordResetIdentifier(identifier: string) {
  if (!identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)) {
    return null;
  }

  return identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length);
}

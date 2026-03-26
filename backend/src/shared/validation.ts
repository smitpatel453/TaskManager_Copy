/**
 * Returns true if the password meets the minimum strength requirements:
 * at least 8 characters, 1 uppercase letter, 1 lowercase letter,
 * 1 digit, and 1 special character.
 */
export function isStrongPassword(password: string): boolean {
  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;
}

export const STRONG_PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";

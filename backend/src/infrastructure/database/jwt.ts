import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../../config/env.js";

const secret = new TextEncoder().encode(ENV.JWT_SECRET);

export type JWTPayload = {
    userId: string;
    email: string;
};

export type EmailVerificationPayload = {
    userId: string;
    email: string;
    purpose: "email-verify";
};
/**
 * Generate a JWT token for a user
 * @param userId - User's database ID
 * @param email - User's email
 * @returns JWT token string
 */
export async function generateToken(userId: string, email: string): Promise<string> {
    const token = await new SignJWT({ userId, email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d") // Token expires in 7 days
        .sign(secret);

    return token;
}

/**
 * Generate a short-lived email verification token
 * @param userId - User's database ID
 * @param email - User's email
 * @returns JWT token string
 */
export async function generateEmailVerificationToken(userId: string, email: string): Promise<string> {
    const token = await new SignJWT({ userId, email, purpose: "email-verify" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

    return token;
}
/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as JWTPayload;
    } catch (error) {
        console.error("JWT verification failed:", error);
        return null;
    }
}

/**
 * Verify email verification token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export async function verifyEmailVerificationToken(token: string): Promise<EmailVerificationPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        const typed = payload as EmailVerificationPayload;
        if (typed.purpose !== "email-verify") {
            return null;
        }
        return typed;
    } catch (error) {
        console.error("Email verification token failed:", error);
        return null;
    }
}

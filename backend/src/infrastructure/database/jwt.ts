import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "awXwNFpMPDdMCjk4eYEi5OdjGHSf7TS/2jMtH3EgfN0=";
const secret = new TextEncoder().encode(JWT_SECRET);

export type JWTPayload = {
    userId: string;
    email: string;
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

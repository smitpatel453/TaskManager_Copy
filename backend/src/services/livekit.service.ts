import { AccessToken } from 'livekit-server-sdk';
import { ENV } from '../config/env.js';

// LiveKit configuration from environment
const LIVEKIT_URL = ENV.LIVEKIT_URL;
const LIVEKIT_API_KEY = ENV.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = ENV.LIVEKIT_API_SECRET;

export interface GenerateTokenParams {
    userId: string;
    userName: string;
    roomName: string;
}

export interface LiveKitTokenResponse {
    token: string;
    url: string;
}

/**
 * Generates a LiveKit access token for a user to join a room
 * This token is required before connecting to the LiveKit server
 */
export async function generateLiveKitToken({
    userId,
    userName,
    roomName,
}: GenerateTokenParams): Promise<LiveKitTokenResponse> {
    try {
        // Validate inputs
        if (!userId || !userName || !roomName) {
            throw new Error(`Missing required token parameters: userId=${!!userId}, userName=${!!userName}, roomName=${!!roomName}`);
        }

        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            throw new Error('LiveKit configuration missing: API_KEY or API_SECRET not set');
        }

        if (!LIVEKIT_URL) {
            throw new Error('LiveKit configuration missing: LIVEKIT_URL not set');
        }

        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

        // Set user identity (REQUIRED by LiveKit)
        at.identity = userId;
        at.name = userName;

        // Set token properties
        at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canPublishData: true,
            canSubscribe: true,
        });

        // Generate JWT token (this is async)
        const token = await at.toJwt();

        // Validate token was generated properly
        if (!token || typeof token !== 'string' || token.length < 50) {
            throw new Error(`Invalid token generated: ${typeof token}, length=${token?.length || 0}`);
        }

        console.log(`✅ LiveKit token generated successfully for user ${userId} in room ${roomName}`);
        console.log(`   Token length: ${token.length}`);
        console.log(`   Token preview: ${token.substring(0, 50)}...`);

        return {
            token,
            url: LIVEKIT_URL,
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ Error generating LiveKit token:', errorMsg);
        console.error('   Full error:', error);
        throw new Error(`Failed to generate LiveKit token: ${errorMsg}`);
    }
}

/**
 * Generates a room name from channel ID
 * Ensures room names are valid (alphanumeric, dashes, underscores)
 */
export function generateRoomName(channelId: string): string {
    return `channel-${channelId}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
}

/**
 * Webhook handler for LiveKit events (optional but useful for tracking)
 * LiveKit will POST to this endpoint when rooms/participants change
 */
export function handleLiveKitWebhook(body: any): void {
    const event = body.event;

    switch (event) {
        case 'participant_joined':
            console.log(`User joined room: ${body.room} - ${body.participant?.identity}`);
            break;
        case 'participant_left':
            console.log(`User left room: ${body.room} - ${body.participant?.identity}`);
            break;
        case 'room_closed':
            console.log(`Room closed: ${body.room}`);
            break;
        default:
            console.log(`LiveKit event: ${event}`);
    }
}

export const liveKitService = {
    generateLiveKitToken: generateLiveKitToken,
    generateRoomName: generateRoomName,
    handleLiveKitWebhook: handleLiveKitWebhook,
    LIVEKIT_URL: LIVEKIT_URL,
};

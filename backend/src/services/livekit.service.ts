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
export function generateLiveKitToken({
    userId,
    userName,
    roomName,
}: GenerateTokenParams): LiveKitTokenResponse {
    try {
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

        // Generate JWT token
        const token = at.toJwt();

        console.log(`✅ LiveKit token generated for user ${userId} in room ${roomName}`);

        return {
            token,
            url: LIVEKIT_URL,
        };
    } catch (error) {
        console.error('Error generating LiveKit token:', error);
        throw new Error('Failed to generate LiveKit token');
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
    generateLiveKitToken,
    generateRoomName,
    handleLiveKitWebhook,
    LIVEKIT_URL,
};

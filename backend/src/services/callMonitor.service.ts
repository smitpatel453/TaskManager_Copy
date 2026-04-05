import { ChannelModel } from '../models/channel.model.js';
import { CallHistoryModel } from '../models/callHistory.model.js';
import { getIO } from '../infrastructure/socket.js';
import { ENV } from '../config/env.js';

const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds
let monitorInterval: NodeJS.Timeout | null = null;

/**
 * Start the call monitor service
 * Monitors active calls and enforces duration limits
 */
export function startCallMonitor() {
    if (monitorInterval) {
        console.warn('⚠️ Call monitor already running');
        return;
    }

    console.log('🚀 Starting call monitor service');
    console.log(
        `📋 Max call duration: ${ENV.MAX_CALL_DURATION_MINUTES} minutes`
    );
    console.log(
        `⏰ Warning threshold: ${ENV.CALL_WARNING_THRESHOLD_MINUTES} minutes`
    );

    monitorInterval = setInterval(async () => {
        try {
            const activeChannels = await ChannelModel.find({
                activeCall: { $exists: true, $ne: null },
            });

            if (activeChannels.length === 0) return;

            for (const channel of activeChannels) {
                if (!channel.activeCall) continue;

                const callDuration =
                    (Date.now() - channel.activeCall.startedAt.getTime()) / 1000 / 60; // in minutes
                const maxDuration = ENV.MAX_CALL_DURATION_MINUTES;
                const warningThreshold = ENV.CALL_WARNING_THRESHOLD_MINUTES;

                const io = getIO();

                // Send warning if approaching max duration
                if (
                    callDuration > warningThreshold &&
                    callDuration < maxDuration
                ) {
                    const minutesRemaining = Math.round(maxDuration - callDuration);
                    console.log(
                        `⏰ Call in ${channel.channelId} will end in ${minutesRemaining} minutes`
                    );

                    io.to(channel.channelId).emit('channel:call-warning', {
                        message: `Call will end in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`,
                        minutesRemaining,
                        channelId: channel.channelId,
                    });
                }

                // Auto-end call if max duration exceeded
                if (callDuration > maxDuration) {
                    console.log(
                        `🛑 Auto-ending call in ${channel.channelId} (duration: ${callDuration.toFixed(1)} minutes)`
                    );

                    const endedAt = new Date();
                    const durationSeconds = Math.floor(callDuration * 60);

                    // Update call history with end time and duration
                    await CallHistoryModel.findOneAndUpdate(
                        {
                            roomName: channel.activeCall.roomName,
                            endedAt: { $exists: false },
                        },
                        {
                            endedAt,
                            duration: durationSeconds,
                            durationVerifiedByLiveKit: false, // Marked as auto-ended, not from webhook
                        }
                    );

                    // Clear active call from channel
                    channel.activeCall = null;
                    await channel.save();

                    // Notify all users in channel
                    io.to(channel.channelId).emit('channel:call-ended', {
                        reason: 'max_duration_exceeded',
                        duration: durationSeconds,
                        message: `Call ended due to maximum duration limit (${maxDuration} minutes)`,
                        channelId: channel.channelId,
                    });

                    console.log(
                        `✅ Call in ${channel.channelId} safely ended by monitor`
                    );
                }
            }
        } catch (error) {
            console.error('❌ Call monitor error:', error);
        }
    }, CHECK_INTERVAL);

    console.log(`✅ Call monitor started (checks every ${CHECK_INTERVAL / 1000}s)`);
}

/**
 * Stop the call monitor service
 */
export function stopCallMonitor() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log('🛑 Call monitor stopped');
    }
}

/**
 * Get remaining time for a call in minutes
 */
export function getRemainingCallTime(startedAt: Date): number {
    const elapsedMinutes =
        (Date.now() - startedAt.getTime()) / 1000 / 60;
    return ENV.MAX_CALL_DURATION_MINUTES - elapsedMinutes;
}

/**
 * Check if a call is approaching max duration
 */
export function isCallApproachingLimit(startedAt: Date): boolean {
    const elapsedMinutes =
        (Date.now() - startedAt.getTime()) / 1000 / 60;
    return elapsedMinutes > ENV.CALL_WARNING_THRESHOLD_MINUTES;
}

/**
 * Check if a call has exceeded max duration
 */
export function hasCallExceededLimit(startedAt: Date): boolean {
    const elapsedMinutes =
        (Date.now() - startedAt.getTime()) / 1000 / 60;
    return elapsedMinutes > ENV.MAX_CALL_DURATION_MINUTES;
}

import { Queue } from 'bullmq';
import { connection } from '../config/redis.js';

export const SLACK_IMPORT_QUEUE = 'slack-import-queue';

let queueInitialized = false;

console.log('[slackImport.queue] Creating queue with Redis connection');

export const slackImportQueue = new Queue(SLACK_IMPORT_QUEUE, {
    connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

slackImportQueue.on('error', (err) => {
    console.error('[slackImportQueue] Queue error:', err.message);
});

slackImportQueue.once('ready', () => {
    if (!queueInitialized) {
        console.log('[slackImportQueue] Queue ready');
        queueInitialized = true;
    }
});

export const addSlackImportJob = async (channelId: string, slackChannelId: string, triggerUserId: string) => {
    console.log(`[addSlackImportJob] Adding job - Channel: ${channelId}, SlackChannel: ${slackChannelId}, User: ${triggerUserId}`);
    try {
        const job = await slackImportQueue.add('import-slack', {
            channelId,
            slackChannelId,
            triggerUserId
        }, {
            removeOnComplete: true,
            removeOnFail: false
        });
        console.log(`[addSlackImportJob] Job added successfully with ID: ${job.id}`);
        return job;
    } catch (err) {
        console.error('[addSlackImportJob] Failed to add job:', (err as Error).message);
        throw err;
    }
};

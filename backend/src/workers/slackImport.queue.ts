import { Queue } from 'bullmq';
import { connection } from '../config/redis.js';

export const SLACK_IMPORT_QUEUE = 'slack-import-queue';

export const slackImportQueue = new Queue(SLACK_IMPORT_QUEUE, {
    connection,
});

export const addSlackImportJob = async (channelId: string, slackChannelId: string, triggerUserId: string) => {
    return await slackImportQueue.add('import-slack', {
        channelId,
        slackChannelId,
        triggerUserId
    }, {
        removeOnComplete: true,
        removeOnFail: false
    });
};

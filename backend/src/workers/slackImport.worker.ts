import { Worker } from 'bullmq';
import { connection } from '../config/redis.js';
import axios from 'axios';
import { getIO } from '../infrastructure/socket.js';
import { ChannelMessageModel } from '../models/channelMessage.model.js';
import { UserMongooseModel } from '../models/user.model.js';

export const startSlackImportWorker = () => {
    const worker = new Worker('slack-import-queue', async (job) => {
        const { channelId, slackChannelId, triggerUserId } = job.data;
        const io = getIO();

        try {
            console.log(`[Slack Import] Starting job ${job.id} for channel ${channelId} from slack ${slackChannelId}`);
            io.to(channelId).emit('slack_import_progress', { status: 'started', progress: 0 });

            if (!slackChannelId) {
                throw new Error("Missing Slack Channel ID");
            }

            const user = await UserMongooseModel.findById(triggerUserId);
            const token = user?.slackIntegration?.accessToken;
            if (!token) {
                throw new Error("User has not connected their Slack account.");
            }

            // 1. Fetch Users List for mapping
            const usersRes = await axios.get('https://slack.com/api/users.list', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!usersRes.data.ok) {
                throw new Error(`Failed to fetch Slack users: ${usersRes.data.error}`);
            }

            const slackUsers = usersRes.data.members || [];
            const allInternalUsers = await UserMongooseModel.find({}).lean();
            const memberMapping: Record<string, string> = {};

            for (const sUser of slackUsers) {
                const sEmail = sUser.profile?.email;
                if (sEmail) {
                    const matchedUser = allInternalUsers.find((u: any) => u.email === sEmail);
                    if (matchedUser) {
                        memberMapping[sUser.id] = matchedUser._id.toString();
                    }
                }
            }

            // 2. Fetch Channel History (with pagination)
            let hasMore = true;
            let cursor: string | undefined = undefined;
            let totalImported = 0;
            let i = 0;

            while (hasMore) {
                const slackHistoryResp: any = await axios.get('https://slack.com/api/conversations.history', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        channel: slackChannelId,
                        limit: 200,
                        cursor
                    }
                });

                if (!slackHistoryResp.data.ok) {
                    throw new Error(`Failed to fetch Slack history: ${slackHistoryResp.data.error}`);
                }

                const messages = slackHistoryResp.data.messages || [];
                
                const messagesToInsert = messages.map((msg: any) => {
                    const fallbackSenderId = triggerUserId; // default
                    const mappedSenderId = msg.user ? memberMapping[msg.user] || fallbackSenderId : fallbackSenderId;

                    return {
                        channelId,
                        text: msg.text || "...",
                        sender: mappedSenderId,
                        createdAt: msg.ts ? new Date(parseFloat(msg.ts) * 1000) : new Date(),
                    };
                });

                if (messagesToInsert.length > 0) {
                    await ChannelMessageModel.insertMany(messagesToInsert);
                    totalImported += messagesToInsert.length;
                    
                    io.to(channelId).emit('slack_import_progress', { 
                        status: 'processing', 
                        progress: i + 1, // sending batch number as progress for now
                        importedSoFar: totalImported
                    });
                }

                hasMore = slackHistoryResp.data.response_metadata?.next_cursor ? true : false;
                cursor = slackHistoryResp.data.response_metadata?.next_cursor;
                i++;
            }

            io.to(channelId).emit('slack_import_progress', { status: 'completed', progress: 100, totalImported });
            console.log(`[Slack Import] Job ${job.id} done! Imported ${totalImported} messages.`);
            
            // Dispatch a server hint to fetch updated message logs
            io.to(channelId).emit('channel_logs_updated', { channelId });

        } catch (error) {
            console.error(`[Slack Import] Failed job ${job.id}`, error);
            io.to(channelId).emit('slack_import_progress', { status: 'error', error: (error as Error).message });
            throw error;
        }
    }, { connection });

    worker.on('failed', (job, err) => {
        console.error(`[Slack Import] Job ${job?.id} failed with error ${err.message}`);
    });
};

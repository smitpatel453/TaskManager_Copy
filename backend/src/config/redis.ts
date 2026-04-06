import Redis from 'ioredis';
import { ENV } from './env.js';

let redisInstance: Redis | null = null;
let redisSubscriberInstance: Redis | null = null;

// The main connection for basic commands, publisher, and standard queues
export const getRedisClient = () => {
    if (!redisInstance) {
        redisInstance = new Redis(ENV.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });

        redisInstance.on('error', (err) => {
            console.error('[Redis error]', err);
        });
    }
    return redisInstance;
};

// A separate connection needed by BullMQ for subscribers/blocking operations
export const getRedisSubscriber = () => {
    if (!redisSubscriberInstance) {
        redisSubscriberInstance = new Redis(ENV.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });

        redisSubscriberInstance.on('error', (err) => {
            console.error('[Redis Subscriber error]', err);
        });
    }
    return redisSubscriberInstance;
};

// BullMQ connection configuration standard
export const connection = {
    host: getRedisClient().options.host,
    port: getRedisClient().options.port,
    username: getRedisClient().options.username,
    password: getRedisClient().options.password,
    db: getRedisClient().options.db,
    tls: getRedisClient().options.tls,
};

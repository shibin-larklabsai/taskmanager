import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times: number) => {
    // Reconnect after
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

class RedisClient {
  private static instance: Redis;
  private static subscriber: Redis;

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(redisConfig);
      this.setupEventListeners(RedisClient.instance);
    }
    return RedisClient.instance;
  }

  public static getSubscriber(): Redis {
    if (!RedisClient.subscriber) {
      RedisClient.subscriber = new Redis(redisConfig);
      this.setupEventListeners(RedisClient.subscriber, 'Subscriber');
    }
    return RedisClient.subscriber;
  }

  private static setupEventListeners(redis: Redis, type: string = 'Client'): void {
    redis.on('connect', () => {
      console.log(`🟢 Redis ${type} connected`);
    });

    redis.on('error', (error) => {
      console.error(`❌ Redis ${type} error:`, error);
    });

    redis.on('reconnecting', () => {
      console.log(`🔄 Redis ${type} reconnecting...`);
    });
  }
}

export const redis = RedisClient.getInstance();
export const redisSubscriber = RedisClient.getSubscriber();

export default redis;

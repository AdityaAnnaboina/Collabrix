import Redis from 'ioredis';
import { env } from './env';

// Only create Redis clients if REDIS_ENABLED is true
// This allows the server to run without Redis in development
const isRedisEnabled = env.REDIS_ENABLED === 'true';

// Create dummy clients that won't connect when Redis is disabled
function createRedisClient(url: string): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true, // Don't connect immediately
    enableOfflineQueue: false,
  });

  if (isRedisEnabled) {
    client.connect().catch((err) => {
      console.error('Redis connection failed:', err.message);
    });

    client.on('connect', () => console.log(`📡 Redis Connected: ${url}`));
    client.on('error', (err) => console.error(`❌ Redis Error:`, err.message));
  }

  return client;
}

export const redis = createRedisClient(env.REDIS_URL);
export const pubClient = createRedisClient(env.REDIS_URL);
export const subClient = pubClient.duplicate();

import { logger } from '../utils/logger';

export interface PeerState {
  userId: string;
  socketId: string;
  name: string;
  avatarUrl: string | null;
  role: 'HOST' | 'PARTICIPANT';
  isMuted: boolean;
  isCamOff: boolean;
  handRaised: boolean;
  isWaiting: boolean;
}

// In-memory fallback store (used when REDIS_ENABLED=false)
const inMemoryStore = new Map<string, Map<string, PeerState>>();

function getInMemoryRoom(roomCode: string): Map<string, PeerState> {
  if (!inMemoryStore.has(roomCode)) {
    inMemoryStore.set(roomCode, new Map());
  }
  return inMemoryStore.get(roomCode)!;
}

export class RoomStateService {
  static async addParticipant(roomCode: string, peer: PeerState): Promise<void> {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        const { redis } = await import('../config/redis');
        const key = `room:state:${roomCode}`;
        await redis.hset(key, peer.userId, JSON.stringify(peer));
        await redis.expire(key, 86400);
      } else {
        getInMemoryRoom(roomCode).set(peer.userId, peer);
      }
      logger.debug('Added participant to room state', { roomCode, userId: peer.userId });
    } catch (error) {
      logger.error('Error adding participant to room state', error, { roomCode });
    }
  }

  static async removeParticipant(roomCode: string, userId: string): Promise<void> {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        const { redis } = await import('../config/redis');
        await redis.hdel(`room:state:${roomCode}`, userId);
      } else {
        getInMemoryRoom(roomCode).delete(userId);
      }
      logger.debug('Removed participant from room state', { roomCode, userId });
    } catch (error) {
      logger.error('Error removing participant from room state', error, { roomCode, userId });
    }
  }

  static async getParticipants(roomCode: string): Promise<PeerState[]> {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        const { redis } = await import('../config/redis');
        const data = await redis.hgetall(`room:state:${roomCode}`);
        return Object.values(data).map((item) => JSON.parse(item) as PeerState);
      } else {
        return Array.from(getInMemoryRoom(roomCode).values());
      }
    } catch (error) {
      logger.error('Error getting participants from room state', error, { roomCode });
      return [];
    }
  }

  static async getParticipant(roomCode: string, userId: string): Promise<PeerState | null> {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        const { redis } = await import('../config/redis');
        const data = await redis.hget(`room:state:${roomCode}`, userId);
        if (!data) return null;
        return JSON.parse(data) as PeerState;
      } else {
        return getInMemoryRoom(roomCode).get(userId) || null;
      }
    } catch (error) {
      logger.error('Error getting single participant from room state', error, { roomCode, userId });
      return null;
    }
  }

  static async updateParticipantState(
    roomCode: string,
    userId: string,
    updates: Partial<Omit<PeerState, 'userId' | 'socketId'>>
  ): Promise<PeerState | null> {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        const { redis } = await import('../config/redis');
        const key = `room:state:${roomCode}`;
        const data = await redis.hget(key, userId);
        if (!data) return null;
        const updatedPeer = { ...JSON.parse(data) as PeerState, ...updates };
        await redis.hset(key, userId, JSON.stringify(updatedPeer));
        return updatedPeer;
      } else {
        const room = getInMemoryRoom(roomCode);
        const peer = room.get(userId);
        if (!peer) return null;
        const updatedPeer = { ...peer, ...updates };
        room.set(userId, updatedPeer);
        return updatedPeer;
      }
    } catch (error) {
      logger.error('Error updating participant state', error, { roomCode, userId });
      return null;
    }
  }

  static async clearRoom(roomCode: string): Promise<void> {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        const { redis } = await import('../config/redis');
        await redis.del(`room:state:${roomCode}`);
      } else {
        inMemoryStore.delete(roomCode);
      }
      logger.info('Cleared room state', { roomCode });
    } catch (error) {
      logger.error('Error clearing room state', error, { roomCode });
    }
  }
}

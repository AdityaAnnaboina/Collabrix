import { Request, Response } from 'express';
import { db } from '../config/db';
import { logger } from '../utils/logger';

// Helper to generate a random 3-4-3 room code (e.g. abc-defg-hij)
function generateRoomCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const rand = (length: number) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `${rand(3)}-${rand(4)}-${rand(3)}`;
}

export class RoomController {
  static async createRoom(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { title } = req.body;

      // Ensure we generate a unique code
      let code = '';
      let attempts = 0;
      while (attempts < 5) {
        const tempCode = generateRoomCode();
        const existing = await db.room.findUnique({ where: { code: tempCode } });
        if (!existing) {
          code = tempCode;
          break;
        }
        attempts++;
      }

      if (!code) {
        return res.status(500).json({ error: 'Failed to generate a unique room code. Try again.' });
      }

      const room = await db.room.create({
        data: {
          code,
          title: title || 'Untitled Meeting',
          hostId: req.user.id,
        },
      });

      logger.info('Room created', { code: room.code, hostId: room.hostId });

      return res.status(201).json({ room });
    } catch (error) {
      logger.error('Create room error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRoom(req: Request, res: Response) {
    try {
      const { code } = req.params;

      const room = await db.room.findUnique({
        where: { code },
        include: {
          host: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.status(200).json({ room });
    } catch (error) {
      logger.error('Get room error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

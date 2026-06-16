import { Server, Socket } from 'socket.io';
import { db } from '../config/db';
import { AuthService } from '../services/auth.service';
import { RoomStateService, PeerState } from '../services/room-state.service';
import { logger } from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
  roomCode?: string;
}

export function setupSockets(io: Server) {
  // Authentication middleware for Socket.IO connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = AuthService.verifyAccessToken(token as string);
      
      const user = await db.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.warn('Socket connection authentication failed', { error });
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    logger.info('User connected to socket', { socketId: socket.id, userId: user.id, name: user.name });

    // JOIN ROOM
    socket.on('join-room', async ({ roomCode }: { roomCode: string }) => {
      try {
        if (!roomCode) {
          return socket.emit('error-msg', 'Room code is required');
        }

        const room = await db.room.findUnique({
          where: { code: roomCode },
          include: { host: true },
        });

        if (!room) {
          return socket.emit('error-msg', 'Room does not exist');
        }

        socket.roomCode = roomCode;
        const isHost = room.hostId === user.id;

        // Fetch current active participants in the room
        const activeParticipants = await RoomStateService.getParticipants(roomCode);
        const hostExists = activeParticipants.some(p => p.role === 'HOST');

        // Check Waiting Room rules:
        // If the room is locked (or host is not in room and joining user is not host), and the user is NOT the host:
        if (room.isLocked && !isHost) {
          logger.info('Participant routed to waiting room', { roomCode, userId: user.id });
          
          const waitingPeer: PeerState = {
            userId: user.id,
            socketId: socket.id,
            name: user.name,
            avatarUrl: user.avatarUrl || null,
            role: 'PARTICIPANT',
            isMuted: true,
            isCamOff: true,
            handRaised: false,
            isWaiting: true,
          };

          // Save waiting status in Redis
          await RoomStateService.addParticipant(roomCode, waitingPeer);
          socket.join(`waiting:${roomCode}`);
          
          socket.emit('waiting-room-joined', { roomCode });
          
          // Notify the host (if connected)
          io.to(roomCode).emit('waiting-room:request', { peer: waitingPeer });
          return;
        }

        // Standard direct join
        await executeJoin(socket, io, roomCode, isHost);

      } catch (error) {
        logger.error('Error handling join-room', error, { roomCode, userId: user.id });
        socket.emit('error-msg', 'Failed to join meeting room');
      }
    });

    // APPROVE WAITING USER
    socket.on('waiting-room:approve', async ({ targetUserId }: { targetUserId: string }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      try {
        const room = await db.room.findUnique({ where: { code: roomCode } });
        if (!room || room.hostId !== user.id) {
          return socket.emit('error-msg', 'Unauthorized: Only hosts can approve requests');
        }

        const targetPeer = await RoomStateService.getParticipant(roomCode, targetUserId);
        if (!targetPeer || !targetPeer.isWaiting) return;

        // Update state in Redis
        await RoomStateService.updateParticipantState(roomCode, targetUserId, { isWaiting: false });
        
        // Notify the target user socket to proceed with joining
        io.to(targetPeer.socketId).emit('waiting-room:approved');
        
        // Notify host that applicant was approved
        socket.emit('waiting-room:request-handled', { targetUserId, approved: true });

      } catch (error) {
        logger.error('Error in waiting-room:approve', error);
      }
    });

    // DENY WAITING USER
    socket.on('waiting-room:deny', async ({ targetUserId }: { targetUserId: string }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      try {
        const room = await db.room.findUnique({ where: { code: roomCode } });
        if (!room || room.hostId !== user.id) {
          return socket.emit('error-msg', 'Unauthorized: Only hosts can deny requests');
        }

        const targetPeer = await RoomStateService.getParticipant(roomCode, targetUserId);
        if (!targetPeer) return;

        // Remove from Redis
        await RoomStateService.removeParticipant(roomCode, targetUserId);
        
        // Notify target client
        io.to(targetPeer.socketId).emit('waiting-room:denied');

        socket.emit('waiting-room:request-handled', { targetUserId, approved: false });
      } catch (error) {
        logger.error('Error in waiting-room:deny', error);
      }
    });

    // SIGNAL RELAY (SDP Offers, Answers, and ICE Candidates)
    socket.on('signal', ({ target, signal }: { target: string; signal: any }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      // target is the target userId or socketId
      // Let's forward sender's userId and signal
      io.to(target).emit('signal', {
        senderId: user.id,
        senderSocketId: socket.id,
        signal,
      });
    });

    // TRACK STATE Toggles (Mic/Camera)
    socket.on('track-state-changed', async ({ type, enabled }: { type: 'audio' | 'video'; enabled: boolean }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      try {
        const updates = type === 'audio' ? { isMuted: !enabled } : { isCamOff: !enabled };
        const updated = await RoomStateService.updateParticipantState(roomCode, user.id, updates);
        
        if (updated) {
          socket.to(roomCode).emit('user-state-changed', {
            userId: user.id,
            updates,
          });
        }
      } catch (error) {
        logger.error('Track state toggle sync failed', error);
      }
    });

    // RAISE HAND
    socket.on('raise-hand', async ({ isRaised }: { isRaised: boolean }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      try {
        const updated = await RoomStateService.updateParticipantState(roomCode, user.id, { handRaised: isRaised });
        if (updated) {
          io.to(roomCode).emit('hand-raised', { userId: user.id, isRaised });
        }
      } catch (error) {
        logger.error('Hand raise state update failed', error);
      }
    });

    // CHAT MESSAGE HANDLER
    socket.on('send-message', async ({ content }: { content: string }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      try {
        const room = await db.room.findUnique({ where: { code: roomCode } });
        if (!room) return;

        // Log message to DB for persistency
        const message = await db.message.create({
          data: {
            roomId: room.id,
            userId: user.id,
            content,
          },
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        });

        io.to(roomCode).emit('receive-message', {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          user: {
            id: message.user.id,
            name: message.user.name,
            avatarUrl: message.user.avatarUrl,
          },
        });
      } catch (error) {
        logger.error('Failed to process message', error);
        socket.emit('error-msg', 'Failed to send message');
      }
    });

    // HOST MUTE REMOTE PARTICIPANT
    socket.on('host:mute-participant', async ({ targetUserId }: { targetUserId: string }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      try {
        const room = await db.room.findUnique({ where: { code: roomCode } });
        if (!room || room.hostId !== user.id) {
          return socket.emit('error-msg', 'Unauthorized host action');
        }

        const targetPeer = await RoomStateService.getParticipant(roomCode, targetUserId);
        if (!targetPeer) return;

        // Send direct mute command to target user socket
        io.to(targetPeer.socketId).emit('host:command-mute');
        logger.info('Host triggered remote mute command', { hostId: user.id, targetUserId });
      } catch (error) {
        logger.error('Mute participant action failed', error);
      }
    });

    // HOST KICK REMOTE PARTICIPANT
    socket.on('host:kick-participant', async ({ targetUserId }: { targetUserId: string }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      try {
        const room = await db.room.findUnique({ where: { code: roomCode } });
        if (!room || room.hostId !== user.id) {
          return socket.emit('error-msg', 'Unauthorized host action');
        }

        const targetPeer = await RoomStateService.getParticipant(roomCode, targetUserId);
        if (!targetPeer) return;

        // Send direct kick command to target user socket
        io.to(targetPeer.socketId).emit('host:command-kick');
        logger.info('Host triggered remote kick command', { hostId: user.id, targetUserId });
      } catch (error) {
        logger.error('Kick participant action failed', error);
      }
    });

    // ACTIVE SPEAKER DETECTION
    socket.on('active-speaker', ({ isSpeaking }: { isSpeaking: boolean }) => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      // Broadcast active speaker state changes to peers
      socket.to(roomCode).emit('active-speaker-changed', {
        userId: user.id,
        isSpeaking,
      });
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      const roomCode = socket.roomCode;
      logger.info('User disconnected from socket', { socketId: socket.id, userId: user.id });

      if (roomCode) {
        try {
          // Remove participant from Redis state
          await RoomStateService.removeParticipant(roomCode, user.id);
          
          // Leave socket rooms
          socket.leave(roomCode);
          socket.leave(`waiting:${roomCode}`);

          // Notify remaining peers
          socket.to(roomCode).emit('user-disconnected', { userId: user.id });

          // Check if room is empty to clean up
          const participants = await RoomStateService.getParticipants(roomCode);
          if (participants.length === 0) {
            await RoomStateService.clearRoom(roomCode);
          }
        } catch (error) {
          logger.error('Error in socket disconnect cleanup', error);
        }
      }
    });
  });
}

// Perform standard room join operation
async function executeJoin(
  socket: AuthenticatedSocket,
  io: Server,
  roomCode: string,
  isHost: boolean
) {
  const user = socket.user!;
  
  // Remove user from waiting room sub-channel if present
  socket.leave(`waiting:${roomCode}`);

  const peer: PeerState = {
    userId: user.id,
    socketId: socket.id,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    role: isHost ? 'HOST' : 'PARTICIPANT',
    isMuted: false, // join unmuted initially
    isCamOff: false, // join with cam on initially (can adjust in preview lobby)
    handRaised: false,
    isWaiting: false,
  };

  // Add participant to Redis room state
  await RoomStateService.addParticipant(roomCode, peer);

  // Socket joins the room channel
  socket.join(roomCode);

  // Fetch all currently active participants in the room
  const activeParticipants = await RoomStateService.getParticipants(roomCode);

  // Filter out the joining user from the list sent back
  const existingPeers = activeParticipants.filter((p) => p.userId !== user.id && !p.isWaiting);

  // Inform the joiner of their entry details & existing users
  socket.emit('room-joined', {
    roomCode,
    me: peer,
    participants: existingPeers,
  });

  // Broadcast to existing users that a new peer has joined
  socket.to(roomCode).emit('user-connected', { peer });

  logger.info('User joined room successfully', { roomCode, userId: user.id, isHost });
}

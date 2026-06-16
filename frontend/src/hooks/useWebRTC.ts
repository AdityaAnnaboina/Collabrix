import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { useRoomStore, Participant } from '../store/useRoomStore';

// Default ICE server fallbacks (STUN)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export interface WebRTCStats {
  latency: number; // RTT in ms
  packetLoss: number; // percentage
  bitrate: number; // kbps
  fps: number;
}

export function useWebRTC(localStream: MediaStream | null) {
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerStats, setPeerStats] = useState<Record<string, WebRTCStats>>({});

  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const sendersRef = useRef<Record<string, Record<string, RTCRtpSender>>>({}); // userId -> { audio, video }
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const {
    roomCode,
    me,
    participants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    isMuted,
    isCamOff,
    isScreenSharing,
    setLocalScreenShare,
    setConnectionState,
    setErrorMessage,
  } = useRoomStore();

  localStreamRef.current = localStream;

  // Helper to create and configure a Peer Connection
  const createPeerConnection = useCallback((targetUserId: string, targetSocketId: string, isInitiator: boolean) => {
    if (pcsRef.current[targetUserId]) {
      console.warn(`Peer connection already exists for user ${targetUserId}, reusing.`);
      return pcsRef.current[targetUserId];
    }

    console.log(`Creating RTCPeerConnection for user ${targetUserId}, initiator=${isInitiator}`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current[targetUserId] = pc;
    sendersRef.current[targetUserId] = {};

    // 1. Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStreamRef.current!);
        if (track.kind === 'audio') sendersRef.current[targetUserId].audio = sender;
        if (track.kind === 'video') sendersRef.current[targetUserId].video = sender;
      });
    }

    // 2. Handle ICE candidate collection
    pc.onicecandidate = (event) => {
      const socket = getSocket();
      if (event.candidate && socket) {
        socket.emit('signal', {
          target: targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    // 3. Handle remote track additions
    pc.ontrack = (event) => {
      console.log(`Received remote track ${event.track.kind} from ${targetUserId}`);
      const stream = event.streams[0] || new MediaStream();
      
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: stream,
      }));
    };

    // 4. Handle ICE state changes & Connection Diagnostics
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE Connection state with ${targetUserId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`ICE failed with ${targetUserId}, initiating ICE restart.`);
        triggerIceRestart(targetUserId, targetSocketId);
      }
    };

    return pc;
  }, []);

  // Trigger ICE restart for connection recovery
  const triggerIceRestart = async (targetUserId: string, targetSocketId: string) => {
    const pc = pcsRef.current[targetUserId];
    if (!pc) return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      if (socket) {
        socket.emit('signal', {
          target: targetSocketId,
          signal: { type: 'offer', sdp: pc.localDescription },
        });
      }
    } catch (err) {
      console.error(`Failed to initiate ICE restart for user ${targetUserId}`, err);
    }
  };

  // Switch Track cleanly without renegotiation
  const replaceTrackOnAllPeers = useCallback(async (kind: 'audio' | 'video', newTrack: MediaStreamTrack | null) => {
    const promises = Object.entries(pcsRef.current).map(async ([userId, pc]) => {
      try {
        const senders = sendersRef.current[userId];
        const sender = senders ? senders[kind] : null;

        if (sender && newTrack) {
          await sender.replaceTrack(newTrack);
        } else if (newTrack) {
          // If no sender exists, we might need to add it, but mesh standard assumes pre-negotiated tracks.
          console.warn(`Sender not found for track type ${kind} to peer ${userId}.`);
        }
      } catch (err) {
        console.error(`Failed to replace track for peer ${userId}`, err);
      }
    });

    await Promise.all(promises);
  }, []);

  // START SCREEN SHARE
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      screenStreamRef.current = stream;
      setLocalScreenShare(true);
      
      const videoTrack = stream.getVideoTracks()[0];
      
      // Swap out the local camera track on all peer connections
      await replaceTrackOnAllPeers('video', videoTrack);

      // Listen for screen share cancellation (from browser HUD UI)
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Failed to capture screen share', error);
    }
  }, [replaceTrackOnAllPeers, setLocalScreenShare]);

  // STOP SCREEN SHARE
  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    
    setLocalScreenShare(false);

    // Revert to local video track if present
    if (localStreamRef.current) {
      const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
      await replaceTrackOnAllPeers('video', localVideoTrack || null);
    } else {
      await replaceTrackOnAllPeers('video', null);
    }
  }, [replaceTrackOnAllPeers, setLocalScreenShare]);

  // Clean up single disconnected peer
  const cleanupPeer = useCallback((userId: string) => {
    console.log(`Cleaning up peer connection with ${userId}`);
    const pc = pcsRef.current[userId];
    if (pc) {
      pc.close();
      delete pcsRef.current[userId];
    }
    delete sendersRef.current[userId];

    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });

    setPeerStats((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });

    removeParticipant(userId);
  }, [removeParticipant]);

  // Clean up all peer connections
  const cleanupAllPeers = useCallback(() => {
    Object.keys(pcsRef.current).forEach(cleanupPeer);
    pcsRef.current = {};
    sendersRef.current = {};
    setRemoteStreams({});
    setPeerStats({});
  }, [cleanupPeer]);

  // Fetch metrics periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const updatedStats: Record<string, WebRTCStats> = {};

      for (const [userId, pc] of Object.entries(pcsRef.current)) {
        try {
          if (pc.signalingState === 'closed') continue;
          
          const stats = await pc.getStats();
          let latency = 0;
          let packetLoss = 0;
          let bitrate = 0;
          let fps = 0;

          stats.forEach((report) => {
            // Latency / Round Trip Time
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime) {
                latency = Math.round(report.currentRoundTripTime * 1000);
              }
            }
            // Packet Loss
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              const packetsLost = report.packetsLost || 0;
              const packetsReceived = report.packetsReceived || 1;
              packetLoss = Math.round((packetsLost / (packetsReceived + packetsLost)) * 100);
              fps = report.framesPerSecond || 0;
            }
            // Bitrate calculation
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              bitrate = Math.round((report.bytesSent * 8) / 1000); // simplify to gross kbps sent
            }
          });

          updatedStats[userId] = { latency, packetLoss, bitrate, fps };
        } catch (err) {
          console.error(`Error gathering stats for user ${userId}`, err);
        }
      }

      setPeerStats(updatedStats);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Listen to Socket.IO signaling events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // A remote peer connected to the room -> we initiate offer
    const handleUserConnected = async ({ peer }: { peer: Participant }) => {
      if (peer.userId === me?.userId) return;
      
      console.log(`Peer joined: ${peer.name}. Initiating WebRTC handshakes.`);
      addParticipant(peer);

      const pc = createPeerConnection(peer.userId, peer.socketId, true);
      
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('signal', {
          target: peer.socketId,
          signal: { type: 'offer', sdp: pc.localDescription },
        });
      } catch (err) {
        console.error(`Error creating offer for user ${peer.userId}`, err);
      }
    };

    // Receive incoming signal from a peer
    const handleSignal = async ({
      senderId,
      senderSocketId,
      signal,
    }: {
      senderId: string;
      senderSocketId: string;
      signal: any;
    }) => {
      // Find corresponding participant name
      const peer = participants.find((p) => p.userId === senderId);
      
      let pc = pcsRef.current[senderId];
      if (!pc) {
        pc = createPeerConnection(senderId, senderSocketId, false);
      }

      try {
        if (signal.type === 'offer') {
          console.log(`Setting remote offer from ${senderId}`);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          socket.emit('signal', {
            target: senderSocketId,
            signal: { type: 'answer', sdp: pc.localDescription },
          });
        } else if (signal.type === 'answer') {
          console.log(`Setting remote answer from ${senderId}`);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate') {
          console.log(`Adding ICE candidate from ${senderId}`);
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (error) {
        console.error(`Error handling signal from ${senderId}`, error);
      }
    };

    const handleUserDisconnected = ({ userId }: { userId: string }) => {
      console.log(`Peer disconnected event for user ${userId}`);
      cleanupPeer(userId);
    };

    const handleUserStateChanged = ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<Participant>;
    }) => {
      updateParticipant(userId, updates);
    };

    socket.on('user-connected', handleUserConnected);
    socket.on('signal', handleSignal);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('user-state-changed', handleUserStateChanged);

    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('signal', handleSignal);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('user-state-changed', handleUserStateChanged);
    };
  }, [
    me,
    participants,
    createPeerConnection,
    addParticipant,
    cleanupPeer,
    updateParticipant,
  ]);

  // Monitor toggle modifications of audio inputs/outputs from Zustand store and apply on track state
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      // Inform peers of state toggle
      const socket = getSocket();
      if (socket) {
        socket.emit('track-state-changed', { type: 'audio', enabled: !isMuted });
      }
    }
  }, [isMuted, localStream]);

  // Monitor camera changes
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCamOff;
      });
      // Inform peers of state toggle
      const socket = getSocket();
      if (socket) {
        socket.emit('track-state-changed', { type: 'video', enabled: !isCamOff });
      }
    }
  }, [isCamOff, localStream]);

  return {
    remoteStreams,
    peerStats,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    cleanupAllPeers,
  };
}

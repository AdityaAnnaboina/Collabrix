'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRoomStore, Participant } from '../../../store/useRoomStore';
import { useDevices } from '../../../hooks/useDevices';
import { useWebRTC } from '../../../hooks/useWebRTC';
import { useActiveSpeaker } from '../../../hooks/useActiveSpeaker';
import { connectSocket, disconnectSocket, getSocket } from '../../../services/socket';
import { api } from '../../../services/api';
import { Lobby } from '../../../components/Lobby';
import { VideoGrid } from '../../../components/VideoGrid';
import { MeetingControls } from '../../../components/MeetingControls';
import { SidePanel } from '../../../components/SidePanel';
import { DebugPanel } from '../../../components/DebugPanel';
import { Loader2, ShieldAlert, ArrowLeft, Video, Mic, Share2, Clipboard, Users } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;
  const router = useRouter();

  const { user, token, isAuthenticated } = useAuthStore();
  const {
    me,
    setMe,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    addMessage,
    addToWaitingList,
    removeFromWaitingList,
    setWaitingList,
    connectionState,
    setConnectionState,
    setSocketConnected,
    isMuted,
    isCamOff,
    setLocalMute,
    setLocalCam,
    resetStore,
  } = useRoomStore();

  // Custom Hooks
  const {
    devices,
    localStream,
    activeAudioId,
    activeVideoId,
    permissionError,
    requestStream,
    switchDevice,
    stopStream,
  } = useDevices();

  const {
    remoteStreams,
    peerStats,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    cleanupAllPeers,
  } = useWebRTC(localStream);

  useActiveSpeaker(localStream);

  const [loading, setLoading] = useState(true);
  const [roomTitle, setRoomTitle] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const socketConnectedRef = useRef(false);

  // 1. Initial Authentication & Room check
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/room/${roomCode}`);
      return;
    }

    const checkRoom = async () => {
      try {
        const res = await api.room.get(roomCode);
        setRoomTitle(res.room.title || 'Untitled Meeting');
        setIsHost(res.room.hostId === user?.id);
        
        // Start device preview stream in Lobby
        setConnectionState('lobby');
        await requestStream();
      } catch (err) {
        console.error(err);
        setConnectionState('error');
      } finally {
        setLoading(false);
      }
    };

    checkRoom();
  }, [roomCode, isAuthenticated, user, router, setConnectionState]);

  const handleLeave = () => {
    // 1. Terminate all tracks
    stopStream();
    
    // 2. Clear WebRTC Connections
    cleanupAllPeers();
    
    // 3. Terminate WebSocket
    disconnectSocket();
    
    // 4. Reset Zustand
    resetStore();

    // 5. Navigate to Home
    router.push('/');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 2. Main Socket Connection Init (triggered on "Join")
  const joinCall = async () => {
    if (!token) return;

    setConnectionState('joining');
    
    // Connect Socket.IO
    const socket = connectSocket(token);
    socketConnectedRef.current = true;

    // Listen for socket connection status
    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('📡 Connected to Signaling Server');
      // Emit room entry request
      socket.emit('join-room', { roomCode });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log('❌ Disconnected from Signaling Server');
    });

    // Handle WAITING LOBBY states
    socket.on('waiting-room-joined', () => {
      setConnectionState('lobby'); // UI handles waiting indicator
    });

    socket.on('waiting-room:approved', () => {
      setConnectionState('joining');
      socket.emit('join-room', { roomCode }); // Re-emit entry
    });

    socket.on('waiting-room:denied', () => {
      setConnectionState('error');
      stopStream();
      disconnectSocket();
    });

    // Handle HOST requests (from applicants trying to join)
    socket.on('waiting-room:request', ({ peer }: { peer: Participant }) => {
      addToWaitingList(peer);
    });

    socket.on('waiting-room:request-handled', ({ targetUserId }: { targetUserId: string }) => {
      removeFromWaitingList(targetUserId);
    });

    // Handle standard room join parameters
    socket.on('room-joined', ({ me, participants: existingParticipants }: { me: Participant; participants: Participant[] }) => {
      setMe(me);
      setParticipants(existingParticipants);
      setConnectionState('connected');
    });

    // Handle text chat feeds
    socket.on('receive-message', (msg: any) => {
      addMessage(msg);
    });

    // Handle administrative forced command relays
    socket.on('host:command-mute', () => {
      setLocalMute(true);
      console.log('🔇 Forced mute command received from host.');
    });

    socket.on('host:command-kick', () => {
      console.log('🚷 Kicked from call by host.');
      handleLeave();
    });

    socket.on('error-msg', (msg: string) => {
      console.error('Socket error event:', msg);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketConnectedRef.current) {
        handleLeave();
      }
    };
  }, []);

  // RENDER LOADING
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0B0F19] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-sm text-gray-400">Verifying security room details...</span>
      </div>
    );
  }

  // RENDER VALIDATION ERRORS
  if (connectionState === 'error') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0B0F19] px-4 text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/25">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-bold text-white">Call Entry Blocked</h2>
          <p className="text-sm text-gray-400">
            This meeting room may not exist, is full, or your permission to join was declined by the host.
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl border border-gray-750 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  // RENDER WAITING LOBBY INDICATOR
  if (connectionState === 'joining' && me?.isWaiting) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0B0F19] px-4 text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/25 animate-pulse-glow">
          <Users className="h-8 w-8 text-blue-500" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-bold text-white">Asking to join...</h2>
          <p className="text-sm text-gray-400">
            Please wait. A meeting host will let you in shortly.
          </p>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <button
          onClick={handleLeave}
          className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 font-medium rounded-xl border border-red-500/20 transition cursor-pointer"
        >
          Cancel Request
        </button>
      </div>
    );
  }

  // RENDER DEVICE PREVIEW LOBBY (Lobby Stage)
  if (connectionState === 'lobby' && !me) {
    return (
      <Lobby
        localStream={localStream}
        devices={devices}
        activeAudioId={activeAudioId}
        activeVideoId={activeVideoId}
        switchDevice={switchDevice}
        isMuted={isMuted}
        isCamOff={isCamOff}
        setLocalMute={setLocalMute}
        setLocalCam={setLocalCam}
        permissionError={permissionError}
        onJoin={joinCall}
        isHost={isHost}
        roomCode={roomCode}
      />
    );
  }

  // RENDER ACTIVE CONFERENCING SYSTEM
  return (
    <div className="flex flex-col h-screen w-full bg-[#0B0F19] overflow-hidden select-none">
      
      {/* Top Meeting Header */}
      <header className="w-full h-16 px-6 border-b border-gray-900 bg-gray-950 flex justify-between items-center z-40">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-wide text-white bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
            {roomTitle}
          </span>
          <span className="text-xs text-gray-500 font-mono hidden sm:inline">| {roomCode}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Invite Copy trigger */}
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition cursor-pointer ${
              copied
                ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/20'
                : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-850 hover:text-white'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : 'Copy Info'}</span>
          </button>
        </div>
      </header>

      {/* Grid + Sidebar flex layouts */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* WebRTC Video Display grids */}
        <VideoGrid localStream={localStream} remoteStreams={remoteStreams} />

        {/* Side Panel (Chat and User list directories) */}
        <SidePanel />

        {/* Diagnostic Panel */}
        {isDebugOpen && <DebugPanel peerStats={peerStats} />}
      </div>

      {/* bottom Meeting actions bar */}
      <MeetingControls
        onLeave={handleLeave}
        isScreenSharing={isScreenSharing}
        startScreenShare={startScreenShare}
        stopScreenShare={stopScreenShare}
        onToggleDebug={() => setIsDebugOpen(!isDebugOpen)}
        isDebugOpen={isDebugOpen}
      />

    </div>
  );
}

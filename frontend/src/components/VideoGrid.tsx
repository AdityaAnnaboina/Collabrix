'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Participant, useRoomStore } from '../store/useRoomStore';
import { MicOff, Pin, PinOff, User, Hand, Volume2 } from 'lucide-react';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
}

export function VideoGrid({ localStream, remoteStreams }: VideoGridProps) {
  const { me, participants, activeSpeakerId } = useRoomStore();
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Combine local and remote participants into a single renderable list
  const allParticipants = React.useMemo(() => {
    const list: (Participant & { isSelf: boolean; stream: MediaStream | null })[] = [];
    
    // Add local user
    if (me) {
      list.push({
        ...me,
        isSelf: true,
        stream: localStream,
      });
    }

    // Add remote participants
    participants.forEach((p) => {
      list.push({
        ...p,
        isSelf: false,
        stream: remoteStreams[p.userId] || null,
      });
    });

    return list;
  }, [me, participants, localStream, remoteStreams]);

  // Determine grid dimensions based on count
  const getGridConfig = (count: number) => {
    if (pinnedId) {
      return 'grid-cols-4 grid-rows-4';
    }
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-3';
  };

  const handleTogglePin = (userId: string) => {
    if (pinnedId === userId) {
      setPinnedId(null);
    } else {
      setPinnedId(userId);
    }
  };

  const pinnedParticipant = allParticipants.find((p) => p.userId === pinnedId);
  const unpinnedParticipants = allParticipants.filter((p) => p.userId !== pinnedId);

  return (
    <div className="flex-1 w-full h-full p-4 flex flex-col justify-center items-center overflow-hidden">
      
      {/* If a participant is pinned, render Main Pin + Sidebar Stack */}
      {pinnedId && pinnedParticipant ? (
        <div className="w-full h-full grid grid-cols-4 gap-4 overflow-hidden">
          
          {/* Pinned Tile (takes 3/4 horizontal space) */}
          <div className="col-span-3 h-full relative rounded-2xl bg-gray-950/80 border border-gray-800 overflow-hidden shadow-2xl">
            <VideoTile
              participant={pinnedParticipant}
              isSpeaking={activeSpeakerId === pinnedParticipant.userId}
              isPinned={true}
              onPinToggle={() => handleTogglePin(pinnedParticipant.userId)}
            />
          </div>

          {/* Sidebar stack for other participants */}
          <div className="col-span-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {unpinnedParticipants.map((p) => (
              <div key={p.userId} className="aspect-video w-full relative rounded-xl bg-gray-950/60 border border-gray-800/80 overflow-hidden">
                <VideoTile
                  participant={p}
                  isSpeaking={activeSpeakerId === p.userId}
                  isPinned={false}
                  onPinToggle={() => handleTogglePin(p.userId)}
                />
              </div>
            ))}
          </div>

        </div>
      ) : (
        /* Regular Responsive Grid Layout */
        <div className={`w-full h-full grid gap-4 max-w-6xl aspect-video ${getGridConfig(allParticipants.length)}`}>
          {allParticipants.map((p) => (
            <div
              key={p.userId}
              className="relative w-full h-full rounded-2xl bg-gray-950 border border-gray-805/85 overflow-hidden shadow-lg group transition-all duration-300"
            >
              <VideoTile
                participant={p}
                isSpeaking={activeSpeakerId === p.userId}
                isPinned={false}
                onPinToggle={() => handleTogglePin(p.userId)}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

/* Sub-component for individual video tile */
interface VideoTileProps {
  participant: Participant & { isSelf: boolean; stream: MediaStream | null };
  isSpeaking: boolean;
  isPinned: boolean;
  onPinToggle: () => void;
}

function VideoTile({ participant, isSpeaking, isPinned, onPinToggle }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream, participant.isCamOff]);

  return (
    <div className={`w-full h-full flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
      isSpeaking ? 'animate-pulse-glow ring-2 ring-blue-500' : ''
    }`}>
      
      {/* 1. Video Node or Avatar */}
      {participant.isCamOff ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/10 border border-blue-500/35 flex items-center justify-center">
            {participant.avatarUrl ? (
              <img
                src={participant.avatarUrl}
                alt={participant.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-blue-400" />
            )}
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isSelf} // Always mute local video playback feedback
          className={`w-full h-full object-cover ${participant.isSelf ? 'transform scale-x-[-1]' : ''}`}
        />
      )}

      {/* 2. Top-Right: Hand Raised Badge */}
      {participant.handRaised && (
        <div className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-2.5 shadow-lg border border-amber-600/40 animate-bounce">
          <Hand className="w-4.5 h-4.5" />
        </div>
      )}

      {/* 3. Bottom-Left: Name & Mic status overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-gray-950/60 px-3 py-1.5 rounded-lg border border-gray-800/80 backdrop-blur-sm">
        <span className="text-xs font-semibold tracking-wide text-white">
          {participant.name} {participant.isSelf ? '(You)' : ''}
        </span>
        {participant.isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-red-500" />
        ) : (
          isSpeaking && <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
        )}
      </div>

      {/* 4. Hover Controls: Pin trigger */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
        <button
          onClick={onPinToggle}
          className="p-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white rounded-full transition shadow-xl cursor-pointer"
          title={isPinned ? 'Unpin participant' : 'Pin participant'}
        >
          {isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
        </button>
      </div>

    </div>
  );
}

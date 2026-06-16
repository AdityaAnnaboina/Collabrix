'use client';

import React, { useEffect } from 'react';
import { Participant } from '../store/useRoomStore';
import { Mic, MicOff, Video, VideoOff, Settings, Sparkles } from 'lucide-react';
import { DevicesState } from '../hooks/useDevices';

interface LobbyProps {
  localStream: MediaStream | null;
  devices: DevicesState;
  activeAudioId: string;
  activeVideoId: string;
  switchDevice: (type: 'audio' | 'video', deviceId: string) => Promise<void>;
  isMuted: boolean;
  isCamOff: boolean;
  setLocalMute: (muted: boolean) => void;
  setLocalCam: (camOff: boolean) => void;
  permissionError: string | null;
  onJoin: () => void;
  isHost: boolean;
  roomCode: string;
}

export function Lobby({
  localStream,
  devices,
  activeAudioId,
  activeVideoId,
  switchDevice,
  isMuted,
  isCamOff,
  setLocalMute,
  setLocalCam,
  permissionError,
  onJoin,
  isHost,
  roomCode,
}: LobbyProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Bind local stream to video tag
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isCamOff]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19] text-[#F3F4F6] justify-center items-center px-4 py-8">
      <div className="max-w-4xl w-full grid md:grid-cols-5 gap-8 items-center bg-gray-900/40 p-6 sm:p-8 rounded-3xl border border-gray-800/80 shadow-2xl animate-slide-up">
        
        {/* Left Column: Video Preview (3/5 width) */}
        <div className="md:col-span-3 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-center overflow-hidden shadow-inner group">
            
            {/* Camera off placeholder */}
            {isCamOff ? (
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <VideoOff className="w-16 h-16 animate-pulse" />
                <span className="text-sm">Your camera is turned off</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl transform scale-x-[-1]"
              />
            )}

            {/* Bottom floating controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-950/70 border border-gray-800/80 rounded-full px-4 py-2 backdrop-blur-md">
              <button
                onClick={() => setLocalMute(!isMuted)}
                className={`p-3 rounded-full transition cursor-pointer ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-650 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                }`}
                title={isMuted ? 'Turn on microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setLocalCam(!isCamOff)}
                className={`p-3 rounded-full transition cursor-pointer ${
                  isCamOff 
                    ? 'bg-red-500 hover:bg-red-650 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                }`}
                title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Show permission warning */}
          {permissionError && (
            <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-lg flex items-center gap-2">
              <Settings className="w-4 h-4 animate-spin" />
              <span>{permissionError} (Try refreshing or checking browser options)</span>
            </div>
          )}
        </div>

        {/* Right Column: Settings & Join Button (2/5 width) */}
        <div className="md:col-span-2 space-y-6 flex flex-col justify-between h-full">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Ready to join?</h2>
              <p className="text-sm text-gray-400 mt-1">Room Code: <span className="font-mono text-blue-400 font-bold">{roomCode}</span></p>
            </div>

            {/* Select Camera */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Camera Device</label>
              <select
                value={activeVideoId}
                onChange={(e) => switchDevice('video', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2.5 text-gray-350 focus:border-blue-500 outline-none transition"
              >
                {devices.videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
                {!devices.videoInputs.length && <option value="">No Camera Found</option>}
              </select>
            </div>

            {/* Select Microphone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Microphone Device</label>
              <select
                value={activeAudioId}
                onChange={(e) => switchDevice('audio', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2.5 text-gray-350 focus:border-blue-500 outline-none transition"
              >
                {devices.audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
                {!devices.audioInputs.length && <option value="">No Microphone Found</option>}
              </select>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={onJoin}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/35 transition cursor-pointer text-base text-center"
            >
              {isHost ? 'Start Meeting' : 'Join Call'}
            </button>
            <p className="text-center text-xs text-gray-500">
              Your audio/video settings will persist when you enter.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}


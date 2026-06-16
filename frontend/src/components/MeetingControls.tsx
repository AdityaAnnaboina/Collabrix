'use client';

import React from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { 
  Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, 
  Hand, MessageSquare, Users, PhoneOff, Settings, Info, Bug 
} from 'lucide-react';

interface MeetingControlsProps {
  onLeave: () => void;
  isScreenSharing: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  onToggleDebug: () => void;
  isDebugOpen: boolean;
}

export function MeetingControls({
  onLeave,
  isScreenSharing,
  startScreenShare,
  stopScreenShare,
  onToggleDebug,
  isDebugOpen,
}: MeetingControlsProps) {
  const {
    isMuted,
    isCamOff,
    handRaised,
    isChatOpen,
    isParticipantsOpen,
    setLocalMute,
    setLocalCam,
    setLocalHand,
    toggleChat,
    toggleParticipants,
  } = useRoomStore();

  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  return (
    <div className="w-full bg-gray-950 border-t border-gray-900 py-4 px-6 flex flex-wrap justify-between items-center gap-4 z-40">
      
      {/* Left side: Info buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDebug}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            isDebugOpen 
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/30 hover:bg-blue-600/25' 
              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title="Toggle Diagnostics"
        >
          <Bug className="w-5 h-5" />
        </button>
      </div>

      {/* Middle side: Mic, Cam, Screen Share, Hand */}
      <div className="flex items-center gap-4">
        {/* Microphone Toggle */}
        <button
          onClick={() => setLocalMute(!isMuted)}
          className={`p-4 rounded-full transition cursor-pointer shadow-md ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={() => setLocalCam(!isCamOff)}
          className={`p-4 rounded-full transition cursor-pointer shadow-md ${
            isCamOff
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white'
          }`}
          title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={handleScreenShareToggle}
          className={`p-4 rounded-full transition cursor-pointer shadow-md ${
            isScreenSharing
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white'
          }`}
          title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
        >
          {isScreenSharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
        </button>

        {/* Hand Raise Toggle */}
        <button
          onClick={() => setLocalHand(!handRaised)}
          className={`p-4 rounded-full transition cursor-pointer shadow-md ${
            handRaised
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white'
          }`}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* End Call Button */}
        <button
          onClick={onLeave}
          className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition shadow-lg hover:shadow-red-600/30 cursor-pointer"
          title="Leave Meeting"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Right side: Sidebar Toggles */}
      <div className="flex items-center gap-3">
        {/* Chat Toggle */}
        <button
          onClick={toggleChat}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            isChatOpen
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/30 hover:bg-blue-600/25'
              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title="Toggle Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Participants Toggle */}
        <button
          onClick={toggleParticipants}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            isParticipantsOpen
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/30 hover:bg-blue-600/25'
              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title="Toggle Participants"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}

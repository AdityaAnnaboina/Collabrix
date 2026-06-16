'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRoomStore, ChatMessage, Participant } from '../store/useRoomStore';
import { getSocket } from '../services/socket';
import { 
  X, Send, User, MicOff, Mic, Volume2, Shield, Hand, 
  Trash2, Ban, Check, UserPlus 
} from 'lucide-react';

export function SidePanel() {
  const {
    me,
    participants,
    messages,
    waitingList,
    isChatOpen,
    isParticipantsOpen,
    toggleChat,
    toggleParticipants,
  } = useRoomStore();

  const [messageText, setMessageText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const socket = getSocket();
  const isHost = me?.role === 'HOST';

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !socket) return;

    socket.emit('send-message', { content: messageText.trim() });
    setMessageText('');
  };

  const handleApprove = (userId: string) => {
    if (socket) socket.emit('waiting-room:approve', { targetUserId: userId });
  };

  const handleDeny = (userId: string) => {
    if (socket) socket.emit('waiting-room:deny', { targetUserId: userId });
  };

  const handleMuteRemote = (userId: string) => {
    if (socket) socket.emit('host:mute-participant', { targetUserId: userId });
  };

  const handleKickRemote = (userId: string) => {
    if (socket) socket.emit('host:kick-participant', { targetUserId: userId });
  };

  if (!isChatOpen && !isParticipantsOpen) return null;

  return (
    <aside className="w-full md:w-80 h-[calc(100vh-80px)] border-l border-gray-900 bg-gray-950 flex flex-col z-35 animate-fade-in">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-900 flex justify-between items-center bg-gray-950/40">
        <h3 className="font-bold text-white tracking-tight">
          {isChatOpen ? 'Meeting Chat' : 'Participants'}
        </h3>
        <button
          onClick={isChatOpen ? toggleChat : toggleParticipants}
          className="p-1.5 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* === 1. CHAT PANEL === */}
        {isChatOpen && (
          <div className="h-full flex flex-col justify-between">
            {/* Message History */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1 animate-slide-up">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-xs font-semibold text-blue-400 truncate max-w-[150px]">
                      {msg.user.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm bg-gray-905 border border-gray-900/60 p-2.5 rounded-xl text-gray-300 break-words">
                    {msg.content}
                  </p>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                  <span className="text-sm">No messages yet</span>
                  <p className="text-xs mt-1">Send a message to everyone in the call.</p>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 rounded-xl border border-gray-800 bg-gray-900/40 px-3.5 py-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none text-xs transition"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        )}

        {/* === 2. PARTICIPANTS PANEL === */}
        {isParticipantsOpen && (
          <div className="space-y-6">
            
            {/* WAITING ROOM (Host View) */}
            {isHost && waitingList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                  <UserPlus className="w-4 h-4" />
                  <span>Lobby Requests ({waitingList.length})</span>
                </div>
                
                <div className="space-y-2">
                  {waitingList.map((p) => (
                    <div key={p.userId} className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl gap-2 animate-pulse-glow">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.name}`}
                          alt={p.name}
                          className="w-7 h-7 rounded-full bg-gray-800 border border-amber-500/40"
                        />
                        <span className="text-xs font-medium text-white truncate">{p.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApprove(p.userId)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer"
                          title="Approve Entry"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeny(p.userId)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition cursor-pointer"
                          title="Deny Entry"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVE PARTICIPANTS */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Active Participants ({participants.length + (me ? 1 : 0)})
              </div>

              <div className="space-y-2.5">
                {/* Local user tile */}
                {me && (
                  <div className="flex justify-between items-center bg-gray-900/40 border border-gray-905 p-3 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={me.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${me.name}`}
                        alt={me.name}
                        className="w-8 h-8 rounded-full bg-gray-800 border border-blue-500/50"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                          {me.name}
                          <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded-sm">You</span>
                        </div>
                        <span className="text-[10px] text-gray-450 flex items-center gap-1 mt-0.5">
                          <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                          Host
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      {me.handRaised && <Hand className="w-4 h-4 text-amber-500 shrink-0" />}
                      {me.isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </div>
                )}

                {/* Remote users list */}
                {participants.map((p) => (
                  <div key={p.userId} className="flex justify-between items-center bg-gray-900/20 hover:bg-gray-900/40 border border-gray-910 p-3 rounded-xl group transition duration-150">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.name}`}
                        alt={p.name}
                        className="w-8 h-8 rounded-full bg-gray-800"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{p.name}</div>
                        {p.role === 'HOST' && (
                          <span className="text-[9px] text-gray-450 flex items-center gap-1 mt-0.5">
                            <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                            Host
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Participant Device Sync & Admin Moderation actions */}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 group-hover:hidden transition">
                        {p.handRaised && <Hand className="w-4 h-4 text-amber-500 shrink-0 animate-bounce" />}
                        {p.isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-emerald-500" />}
                      </div>

                      {/* Admin moderation triggers (rendered only for Host to act on participants) */}
                      {isHost && (
                        <div className="hidden group-hover:flex items-center gap-1.5 transition">
                          {!p.isMuted && (
                            <button
                              onClick={() => handleMuteRemote(p.userId)}
                              className="p-1.5 bg-gray-800 hover:bg-red-500/10 hover:text-red-500 border border-gray-700 hover:border-red-500/20 text-gray-400 rounded-lg transition cursor-pointer"
                              title="Mute Participant"
                            >
                              <MicOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleKickRemote(p.userId)}
                            className="p-1.5 bg-gray-800 hover:bg-red-500/10 hover:text-red-500 border border-gray-700 hover:border-red-500/20 text-gray-400 rounded-lg transition cursor-pointer"
                            title="Remove Participant"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </aside>
  );
}

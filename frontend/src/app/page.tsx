'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { Video, Keyboard, LogOut, ArrowRight, Loader2, Calendar, ShieldCheck, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');
  
  const { user, isAuthenticated, clearAuth, isLoading: authStoreLoading } = useAuthStore();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authStoreLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authStoreLoading, router]);

  // Set greeting based on local hour
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting('Good morning');
    else if (hours < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleCreateMeeting = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.room.create('Instant Meeting');
      router.push(`/room/${res.room.code}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create a meeting. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    // Clean up code format (e.g. abc-defg-hij)
    const cleanedCode = roomCode.trim().toLowerCase().replace(/\s+/g, '');

    try {
      setLoading(true);
      setErrorMsg(null);
      
      // Verify room exists before navigating
      const res = await api.room.get(cleanedCode);
      router.push(`/room/${res.room.code}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Invalid room code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      clearAuth();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (authStoreLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B0F19]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19]">
      {/* Top Navbar */}
      <header className="w-full py-4 px-6 md:px-12 flex justify-between items-center border-b border-gray-800/60 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <Video className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            MeetHub
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-gray-950/40 border border-gray-800 rounded-full py-1.5 pl-3 pr-4">
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name}`}
              alt="Avatar"
              className="w-7 h-7 rounded-full border border-blue-500/50 bg-gray-800"
            />
            <span className="text-sm font-medium text-gray-300 hidden sm:inline">{user?.name}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 border border-gray-800 p-2.5 text-gray-400 hover:text-white hover:bg-gray-850 hover:border-gray-700 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center">
        {/* Left Control Panel */}
        <div className="space-y-8 animate-slide-up">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Grade Video Conferencing</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {greeting}, <br />
              <span className="text-blue-500">{user?.name}</span>
            </h1>
            <p className="text-lg text-gray-450 max-w-lg">
              Secure, reliable, and high-fidelity video meetings for everyone. Fully integrated with screen sharing, lobby moderation, and active noise filtering.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/20 p-4 text-sm text-red-400 max-w-md">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-xl">
            <button
              onClick={handleCreateMeeting}
              disabled={loading}
              className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-4 rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer text-base disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  New Meeting
                </>
              )}
            </button>

            <form onSubmit={handleJoinMeeting} className="flex-1 flex items-stretch gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Keyboard className="h-5 w-5 text-gray-550" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter a room code (e.g. abc-defg-hij)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900/40 pl-11 pr-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !roomCode.trim()}
                className="flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-750 hover:border-gray-650 text-white font-medium px-5 py-4 rounded-xl transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          <div className="border-t border-gray-800/80 pt-8 max-w-md grid grid-cols-2 gap-4">
            <div className="flex gap-3 items-start">
              <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Encrypted calls</h4>
                <p className="text-xs text-gray-400 mt-1">WebRTC DTLS/SRTP audio & video streams</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white font-sans">Lobby Control</h4>
                <p className="text-xs text-gray-400 mt-1">Waiting rooms prevent unauthorized entries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Card Panel */}
        <div className="hidden md:flex flex-col items-center justify-center animate-fade-in">
          <div className="relative max-w-md w-full glass-card p-6 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
            <div className="aspect-video w-full rounded-2xl bg-gray-950/60 border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent opacity-60"></div>
              <Video className="w-16 h-16 text-gray-700 group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-xs text-gray-400">
                <span>Preview window</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Ready</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Create instant rooms</h3>
              <p className="text-sm text-gray-455">
                Generate shareable invite links with a single click. Send invitations instantly to colleagues or external guests.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

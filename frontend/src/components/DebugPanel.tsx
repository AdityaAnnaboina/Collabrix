'use client';

import React from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { WebRTCStats } from '../hooks/useWebRTC';
import { Bug, Cpu, Wifi, Activity, Terminal, ShieldAlert } from 'lucide-react';

interface DebugPanelProps {
  peerStats: Record<string, WebRTCStats>;
}

export function DebugPanel({ peerStats }: DebugPanelProps) {
  const { participants, me } = useRoomStore();

  return (
    <div className="absolute top-20 left-6 w-80 max-h-[70vh] bg-gray-950/90 border border-gray-800 rounded-2xl shadow-2xl p-4 overflow-y-auto z-45 backdrop-blur-md text-xs font-mono space-y-4 text-gray-300 animate-slide-up">
      
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-900 pb-2 text-white font-bold">
        <Bug className="w-4 h-4 text-blue-500" />
        <span>WebRTC Web Diagnostic Panel</span>
      </div>

      {/* Local System Specs */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
          <Cpu className="w-3.5 h-3.5" />
          <span>Local client metadata</span>
        </div>
        <div className="grid grid-cols-2 gap-1 pl-5">
          <span className="text-gray-500">User agent:</span>
          <span className="truncate text-right">{typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Node'}</span>
          <span className="text-gray-500">Screen size:</span>
          <span className="text-right">{typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</span>
          <span className="text-gray-500">Role:</span>
          <span className="text-right text-emerald-500">{me?.role || 'N/A'}</span>
        </div>
      </div>

      {/* Peer Quality Connections */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
          <Activity className="w-3.5 h-3.5" />
          <span>RTC Mesh Connections ({participants.length})</span>
        </div>

        {participants.length === 0 ? (
          <div className="text-gray-500 pl-5 italic">No active peer channels.</div>
        ) : (
          <div className="space-y-3 pl-2 border-l border-gray-900">
            {participants.map((p) => {
              const stats = peerStats[p.userId];
              const rtt = stats?.latency ?? 0;
              const loss = stats?.packetLoss ?? 0;
              const bitrate = stats?.bitrate ?? 0;
              const fps = stats?.fps ?? 0;

              // Connections health evaluation
              let health = 'Excellent';
              let healthColor = 'text-emerald-500';
              if (rtt > 250 || loss > 8) {
                health = 'Poor';
                healthColor = 'text-red-500';
              } else if (rtt > 120 || loss > 3) {
                health = 'Fair';
                healthColor = 'text-amber-500';
              }

              return (
                <div key={p.userId} className="space-y-1 bg-gray-900/30 p-2 rounded-lg border border-gray-905">
                  <div className="flex justify-between font-bold text-white">
                    <span className="truncate max-w-[150px]">{p.name}</span>
                    <span className={healthColor}>{health}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-0.5 text-[10px]">
                    <span className="text-gray-500">Round Trip Time:</span>
                    <span className="text-right">{rtt ? `${rtt}ms` : 'Calculating...'}</span>
                    <span className="text-gray-500">Packet Loss:</span>
                    <span className="text-right">{rtt ? `${loss}%` : 'Calculating...'}</span>
                    <span className="text-gray-500">Bitrate:</span>
                    <span className="text-right">{bitrate ? `${bitrate}kbps` : 'Calculating...'}</span>
                    <span className="text-gray-500">Video FPS:</span>
                    <span className="text-right">{fps ? `${fps} fps` : 'Calculating...'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Network Alert note */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl flex items-start gap-2 text-[10px] text-gray-400 font-sans">
        <Wifi className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p>Bitrate dynamic adaptation scales stream qualities under poor bandwidth or elevated packets loss thresholds.</p>
      </div>

    </div>
  );
}

import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { useRoomStore } from '../store/useRoomStore';

export function useActiveSpeaker(localStream: MediaStream | null) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSpeakingStateRef = useRef<boolean>(false);
  
  const { isMuted, setActiveSpeaker } = useRoomStore();

  useEffect(() => {
    if (!localStream || isMuted) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (lastSpeakingStateRef.current) {
        lastSpeakingStateRef.current = false;
        const socket = getSocket();
        if (socket) socket.emit('active-speaker', { isSpeaking: false });
      }
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume amplitude
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;

        // Threshold of volume activation
        const isSpeaking = average > 30; // 0-255 scale

        if (isSpeaking !== lastSpeakingStateRef.current) {
          lastSpeakingStateRef.current = isSpeaking;
          const socket = getSocket();
          if (socket) {
            socket.emit('active-speaker', { isSpeaking });
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animationFrameRef.current = requestAnimationFrame(checkVolume);

    } catch (err) {
      console.error('Audio analyzer setup failed for active speaker detection', err);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      
      // Notify speaking stop on cleanup
      if (lastSpeakingStateRef.current) {
        const socket = getSocket();
        if (socket) socket.emit('active-speaker', { isSpeaking: false });
      }
    };
  }, [localStream, isMuted]);

  // Listen for socket events from other peers speaking
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleSpeakerChanged = ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
      if (isSpeaking) {
        setActiveSpeaker(userId);
      } else {
        setActiveSpeaker(null);
      }
    };

    socket.on('active-speaker-changed', handleSpeakerChanged);
    return () => {
      socket.off('active-speaker-changed', handleSpeakerChanged);
    };
  }, [setActiveSpeaker]);
}

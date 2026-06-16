import { useEffect, useState, useCallback, useRef } from 'react';
import { useRoomStore } from '../store/useRoomStore';

export interface DevicesState {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export function useDevices() {
  const [devices, setDevices] = useState<DevicesState>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string>('');
  const [activeVideoId, setActiveVideoId] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const { isMuted, isCamOff, setLocalMute, setLocalCam } = useRoomStore();

  const stopTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Track ${track.kind} stopped.`);
      });
    }
  }, []);

  const getDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = list.filter((d) => d.kind === 'audioinput');
      const videoInputs = list.filter((d) => d.kind === 'videoinput');
      const audioOutputs = list.filter((d) => d.kind === 'audiooutput');

      setDevices({ audioInputs, videoInputs, audioOutputs });

      // Auto-select defaults if not set
      if (audioInputs.length && !activeAudioId) {
        setActiveAudioId(audioInputs[0].deviceId);
      }
      if (videoInputs.length && !activeVideoId) {
        setActiveVideoId(videoInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to enumerate devices', error);
    }
  }, [activeAudioId, activeVideoId]);

  const requestStream = useCallback(async (audioId: string, videoId: string) => {
    try {
      setPermissionError(null);
      
      // Stop old stream
      if (localStreamRef.current) {
        stopTracks(localStreamRef.current);
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: audioId ? { exact: audioId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          deviceId: videoId ? { exact: videoId } : undefined,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply initial muted/camera state from store
      stream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
      stream.getVideoTracks().forEach((t) => (t.enabled = !isCamOff));

      // Re-populate device list since permissions are now granted
      await getDevices();

      return stream;
    } catch (error: any) {
      console.error('Error acquiring media stream:', error);
      setPermissionError(error.message || 'Could not access camera or microphone');
      
      // Fallback: try audio only if camera is blocked/unavailable
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        localStreamRef.current = fallbackStream;
        setLocalStream(fallbackStream);
        setLocalCam(true); // video is off
        await getDevices();
        return fallbackStream;
      } catch (fallbackError) {
        console.error('Double media capture error:', fallbackError);
        setPermissionError('Camera and microphone access denied.');
      }
      return null;
    }
  }, [getDevices, stopTracks, isMuted, isCamOff, setLocalCam]);

  // Handle switching devices on the fly
  const switchDevice = useCallback(async (type: 'audio' | 'video', deviceId: string) => {
    if (type === 'audio') {
      setActiveAudioId(deviceId);
      await requestStream(deviceId, activeVideoId);
    } else {
      setActiveVideoId(deviceId);
      await requestStream(activeAudioId, deviceId);
    }
  }, [activeAudioId, activeVideoId, requestStream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        stopTracks(localStreamRef.current);
      }
    };
  }, [stopTracks]);

  // Detect plug/unplug events
  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, [getDevices]);

  return {
    devices,
    localStream,
    activeAudioId,
    activeVideoId,
    permissionError,
    requestStream: () => requestStream(activeAudioId, activeVideoId),
    switchDevice,
    stopStream: () => {
      if (localStreamRef.current) {
        stopTracks(localStreamRef.current);
        localStreamRef.current = null;
        setLocalStream(null);
      }
    },
  };
}

import { create } from 'zustand';

export interface Participant {
  userId: string;
  socketId: string;
  name: string;
  avatarUrl: string | null;
  role: 'HOST' | 'PARTICIPANT';
  isMuted: boolean;
  isCamOff: boolean;
  handRaised: boolean;
  isWaiting: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface RoomState {
  // Room metadata
  roomCode: string | null;
  me: Participant | null;
  participants: Participant[];
  messages: ChatMessage[];
  waitingList: Participant[];
  
  // Local Media Control States (before/during call)
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;

  // Active States
  activeSpeakerId: string | null;
  socketConnected: boolean;
  connectionState: 'idle' | 'lobby' | 'joining' | 'connected' | 'disconnected' | 'error';
  errorMessage: string | null;

  // UI overlays
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isSettingsOpen: boolean;

  // Actions
  setRoomCode: (code: string | null) => void;
  setMe: (peer: Participant | null) => void;
  setParticipants: (peers: Participant[]) => void;
  addParticipant: (peer: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Omit<Participant, 'userId' | 'socketId'>>) => void;
  
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  
  addToWaitingList: (peer: Participant) => void;
  removeFromWaitingList: (userId: string) => void;
  setWaitingList: (peers: Participant[]) => void;

  setLocalMute: (muted: boolean) => void;
  setLocalCam: (camOff: boolean) => void;
  setLocalScreenShare: (sharing: boolean) => void;
  setLocalHand: (raised: boolean) => void;
  
  setActiveSpeaker: (userId: string | null) => void;
  setSocketConnected: (connected: boolean) => void;
  setConnectionState: (state: RoomState['connectionState']) => void;
  setErrorMessage: (msg: string | null) => void;

  toggleChat: () => void;
  toggleParticipants: () => void;
  toggleSettings: () => void;
  closeAllPanels: () => void;
  
  resetStore: () => void;
}

const initialState = {
  roomCode: null,
  me: null,
  participants: [],
  messages: [],
  waitingList: [],
  
  isMuted: false,
  isCamOff: false,
  isScreenSharing: false,
  handRaised: false,

  activeSpeakerId: null,
  socketConnected: false,
  connectionState: 'idle' as const,
  errorMessage: null,

  isChatOpen: false,
  isParticipantsOpen: false,
  isSettingsOpen: false,
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setRoomCode: (roomCode) => set({ roomCode }),
  setMe: (me) => set({ me }),
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (peer) => set((state) => {
    // Avoid duplicates
    const exists = state.participants.some((p) => p.userId === peer.userId);
    if (exists) {
      return {
        participants: state.participants.map((p) => p.userId === peer.userId ? peer : p)
      };
    }
    return { participants: [...state.participants, peer] };
  }),

  removeParticipant: (userId) => set((state) => ({
    participants: state.participants.filter((p) => p.userId !== userId)
  })),

  updateParticipant: (userId, updates) => set((state) => ({
    participants: state.participants.map((p) => 
      p.userId === userId ? { ...p, ...updates } : p
    ),
    // Also update local `me` if self-updates occur
    me: state.me && state.me.userId === userId ? { ...state.me, ...updates } : state.me
  })),

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg]
  })),

  setMessages: (messages) => set({ messages }),

  addToWaitingList: (peer) => set((state) => {
    const exists = state.waitingList.some((p) => p.userId === peer.userId);
    if (exists) return {};
    return { waitingList: [...state.waitingList, peer] };
  }),

  removeFromWaitingList: (userId) => set((state) => ({
    waitingList: state.waitingList.filter((p) => p.userId !== userId)
  })),

  setWaitingList: (waitingList) => set({ waitingList }),

  setLocalMute: (isMuted) => set((state) => ({
    isMuted,
    me: state.me ? { ...state.me, isMuted } : null
  })),

  setLocalCam: (isCamOff) => set((state) => ({
    isCamOff,
    me: state.me ? { ...state.me, isCamOff } : null
  })),

  setLocalScreenShare: (isScreenSharing) => set({ isScreenSharing }),
  
  setLocalHand: (handRaised) => set((state) => ({
    handRaised,
    me: state.me ? { ...state.me, handRaised } : null
  })),

  setActiveSpeaker: (activeSpeakerId) => set({ activeSpeakerId }),
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),

  toggleChat: () => set((state) => ({ 
    isChatOpen: !state.isChatOpen,
    isParticipantsOpen: false,
    isSettingsOpen: false
  })),

  toggleParticipants: () => set((state) => ({ 
    isParticipantsOpen: !state.isParticipantsOpen,
    isChatOpen: false,
    isSettingsOpen: false
  })),

  toggleSettings: () => set((state) => ({ 
    isSettingsOpen: !state.isSettingsOpen,
    isChatOpen: false,
    isParticipantsOpen: false
  })),

  closeAllPanels: () => set({ 
    isChatOpen: false, 
    isParticipantsOpen: false, 
    isSettingsOpen: false 
  }),

  resetStore: () => set(initialState),
}));

import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  needsProfileSetup: boolean;
  setSession: (accessToken: string, userId: string, needsProfileSetup: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  needsProfileSetup: false,
  setSession: (accessToken, userId, needsProfileSetup) => set({ accessToken, userId, needsProfileSetup }),
  logout: () => set({ accessToken: null, userId: null, needsProfileSetup: false }),
}));

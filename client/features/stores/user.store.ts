import { create } from 'zustand';

interface UserState {
  username: string | null;
  telegramId: string | null;
  photoUrl: string | null;
  setUser: (user: {
    username?: string | null;
    telegramId?: string | null;
    photoUrl?: string | null;
  }) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  username: null,
  telegramId: null,
  photoUrl: null,
  setUser: (user) =>
    set((state) => ({
      ...state,
      ...user,
    })),
  clearUser: () =>
    set({
      username: null,
      telegramId: null,
      photoUrl: null,
    }),
}));


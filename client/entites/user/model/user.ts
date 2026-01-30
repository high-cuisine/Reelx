import { create } from 'zustand';
import { User } from '../interface/user.interface';
import { Game } from '../interface/game.interface';

interface UserState {
    user: User | null;
    games: Game[] | null;
    authError: string | null;
    setGames: (games: Game[]) => void;
    addGame: (game: Game) => void;
    setUser: (user: User) => void;
    setAuthError: (error: string | null) => void;
    updateBalance: (amount: number, type: 'stars' | 'ton') => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    games: null,
    authError: null,
    setGames: (games: Game[]) => set({ games }),
    addGame: (game: Game) => set((state) => {
        if (!state.games) return { games: [game] };
        return { games: [...state.games, game] };
    }),
    setUser: (user: User) => set({ user }),
    setAuthError: (error: string | null) => set({ authError: error }),
    updateBalance: (amount: number, type: 'stars' | 'ton') =>
        set((state) => {
            if (!state.user) return {};
            if (type === 'stars') {
                return { user: { ...state.user, starsBalance: (state.user.starsBalance ?? 0) + amount } };
            } else if (type === 'ton') {
                return { user: { ...state.user, tonBalance: (state.user.tonBalance ?? 0) + amount } };
            }
            return {};
        }),
}));
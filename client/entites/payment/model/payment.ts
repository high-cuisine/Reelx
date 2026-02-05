import { create } from 'zustand';
interface PaymentState {
    starsBalance: number;
    tonBalance: number;
    setStarsBalance: (starsBalance: number) => void;
    setTonBalance: (tonBalance: number) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
    starsBalance: 0,
    tonBalance: 0,
    setStarsBalance: (starsBalance: number) => set({ starsBalance }),
    setTonBalance: (tonBalance: number) => set({ tonBalance }),
  
}));
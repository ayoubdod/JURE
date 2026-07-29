import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EmailVerificationStore {
  email: string;
  timeLeft: number;
  isResending: boolean;
  canResend: boolean;
  setEmail: (email: string) => void;
  setIsResending: (isResending: boolean) => void;
  resetTimer: () => void;
  decrementTimeLeft: () => void;
}

export const useEmailVerificationStore = create<EmailVerificationStore>()(
  persist(
    (set) => ({
      email: '',
      timeLeft: 60,
      isResending: false,
      canResend: false,
      setEmail: (email) => set({ email }),
      setIsResending: (isResending) => set({ isResending }),
      resetTimer: () => set({ timeLeft: 60, canResend: false }),
      decrementTimeLeft: () =>
        set((state) => {
          const newTime = Math.max(0, state.timeLeft - 1);
          return { timeLeft: newTime, canResend: newTime === 0 };
        }),
    }),
    {
      name: 'email-verification-storage',
    }
  )
);


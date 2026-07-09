import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  needs_password_change?: boolean;
}

interface AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  setAuth: (user: User, permissions: string[]) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      permissions: [],
      isAuthenticated: false,
      setAuth: (user, permissions) => {
        set({ user, permissions, isAuthenticated: true });
      },
      logout: () => {
        set({ user: null, permissions: [], isAuthenticated: false });
      },
      updateUser: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
    }),
    {
      name: "auth-storage",
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  salon_id: number;
  salon_slug?: string;
  branch_id?: number | null;
  needs_password_change?: boolean;
  plan_name?: string;
}

interface AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  targetSalonId: number | null;
  activeBranchId: number | null;
  activeBranchName: string | null;
  setAuth: (user: User, permissions: string[]) => void;
  setTargetSalonId: (id: number | null) => void;
  setActiveBranch: (id: number | null, name: string | null) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      permissions: [],
      isAuthenticated: false,
      targetSalonId: null,
      activeBranchId: null,
      activeBranchName: null,
      setAuth: (user, permissions) => {
        set({ user, permissions, isAuthenticated: true });
      },
      setTargetSalonId: (targetSalonId) => set({ targetSalonId }),
      setActiveBranch: (activeBranchId, activeBranchName) => set({ activeBranchId, activeBranchName }),
      logout: () => {
        set({ user: null, permissions: [], isAuthenticated: false, targetSalonId: null, activeBranchId: null, activeBranchName: null });
      },
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
    }),
    {
      name: 'salon-auth-storage',
    }
  )
);

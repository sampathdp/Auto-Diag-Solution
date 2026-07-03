import { useAuthStore } from '@/store/useAuthStore';

export const useAuth = () => {
  const { user, isAuthenticated, logout, setAuth } = useAuthStore();
  
  return {
    user,
    isAuthenticated,
    logout,
    setAuth,
    isAdmin: user?.role === 'super_admin' || user?.role === 'salon_owner'
  };
};

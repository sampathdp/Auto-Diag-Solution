import { useAuthStore } from '@/store/useAuthStore';

export const usePermissions = () => {
  const { permissions, user } = useAuthStore();

  const can = (permission: string): boolean => {
    if (user?.role === 'admin') return true;

    return permissions.some((p) => {
      if (p === permission || p === '*') return true;
      if (p.includes('*')) {
        const pattern = new RegExp('^' + p.replace('*', '.*') + '$');
        return pattern.test(permission);
      }
      return false;
    });
  };

  const canAny = (perms: string[]): boolean => perms.some((p) => can(p));
  const canAll = (perms: string[]): boolean => perms.every((p) => can(p));

  return { can, canAny, canAll, permissions };
};

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAdminMe } from "@/lib/admin/hooks/useAdminAuth";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";

/**
 * Wraps every (protected) admin page: validates the HttpOnly-cookie session via
 * GET /auth/me and redirects to /admin/login unless a valid admin-role session exists.
 * There is no client-readable token to check up front (by design — HttpOnly cookies
 * aren't visible to JS) so every mount re-validates against the backend.
 */
export function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setAuth, logout, isAdmin } = useAuth();
  const meQuery = useAdminMe();

  useEffect(() => {
    if (!meQuery.data) return;

    if (meQuery.data.user.role !== "admin") {
      logout();
      router.replace("/admin/login");
      return;
    }

    setAuth(meQuery.data.user, meQuery.data.permissions ?? []);
  }, [meQuery.data, setAuth, logout, router]);

  useEffect(() => {
    if (meQuery.isError) {
      logout();
      router.replace("/admin/login");
    }
  }, [meQuery.isError, logout, router]);

  if (meQuery.isLoading) return <FullScreenLoader label="Loading your dashboard…" />;
  if (!isAdmin) return null;

  return <>{children}</>;
}

import { RequireAdminAuth } from "@/components/admin/auth/RequireAdminAuth";
import { AdminShell } from "@/components/admin/layout/AdminShell";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdminAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAdminAuth>
  );
}

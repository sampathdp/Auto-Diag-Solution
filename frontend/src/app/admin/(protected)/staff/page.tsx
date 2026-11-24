"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Input } from "@/components/admin/ui/Input";
import { Checkbox } from "@/components/admin/ui/Checkbox";
import { Switch } from "@/components/admin/ui/Switch";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { useAuthStore } from "@/store/useAuthStore";
import type { PermissionDefinition, StaffPermissions, StaffUser } from "@/types/staff";

const truthy = (v: number | boolean | undefined) => v === true || v === 1;

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const myPermissions = useAuthStore((s) => s.permissions);
  const iAmSuper = myPermissions.includes("*");

  const staffQuery = useAdminQuery<StaffUser[]>(adminQueryKeys.staff.list, "/users", { role: "admin", per_page: 200 });
  const catalogueQuery = useAdminQuery<PermissionDefinition[]>(adminQueryKeys.staff.catalogue, "/permissions");

  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: ColumnDef<StaffUser, any>[] = [
    {
      accessorKey: "name",
      header: "Staff member",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">
            {row.original.name}
            {row.original.id === currentUserId && <span className="ml-2 text-caption text-ink-muted">(you)</span>}
          </p>
          <p className="text-caption text-ink-muted">{row.original.email}</p>
        </div>
      ),
    },
    {
      id: "access",
      header: "Access",
      enableSorting: false,
      cell: ({ row }) =>
        truthy(row.original.is_super_admin) ? <Badge variant="info">Super admin</Badge> : <Badge variant="neutral">Limited</Badge>,
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) =>
        truthy(row.original.is_active) ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Deactivated</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff & Permissions"
        description="Super admins can do everything. Other staff can only do what you tick for them. Financial actions always need a permission."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Add staff member
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={staffQuery.data ?? []}
        isLoading={staffQuery.isLoading}
        getRowId={(u) => String(u.id)}
        onRowClick={(u) => setEditing(u)}
        emptyState={{ icon: ShieldCheck, title: "No staff accounts", message: "Add a staff member to give them admin access." }}
      />

      {editing && (
        <PermissionsDrawer
          user={editing}
          catalogue={catalogueQuery.data ?? []}
          canEdit={iAmSuper}
          isSelf={editing.id === currentUserId}
          onClose={() => setEditing(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: adminQueryKeys.staff.all })}
        />
      )}

      <CreateStaffDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(user) => {
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.staff.all });
          setCreating(false);
          setEditing(user);
        }}
      />
    </div>
  );
}

function PermissionsDrawer({
  user,
  catalogue,
  canEdit,
  isSelf,
  onClose,
  onSaved,
}: {
  user: StaffUser;
  catalogue: PermissionDefinition[];
  canEdit: boolean;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const query = useQuery({
    queryKey: adminQueryKeys.staff.permissions(user.id),
    queryFn: () => adminApi.get<StaffPermissions>(`/users/${user.id}/permissions`),
  });

  const [isSuper, setIsSuper] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (query.data) {
      setIsSuper(query.data.is_super_admin);
      setSelected(new Set(query.data.permissions));
    }
  }, [query.data]);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    for (const p of catalogue) map.set(p.group, [...(map.get(p.group) ?? []), p]);
    return Array.from(map.entries());
  }, [catalogue]);

  const save = useMutation({
    mutationFn: () =>
      adminApi.put(`/users/${user.id}/permissions`, { is_super_admin: isSuper, permissions: Array.from(selected) }),
    onSuccess: () => {
      showSuccess("Permissions saved");
      onSaved();
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save permissions."),
  });

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Drawer
      open
      onClose={onClose}
      title={user.name}
      width="lg"
      footer={
        canEdit ? (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              Save permissions
            </Button>
          </div>
        ) : undefined
      }
    >
      <p className="mb-4 text-caption text-ink-muted">{user.email}</p>

      {!canEdit && (
        <p className="mb-4 rounded-sm bg-warning/10 px-3 py-2 text-caption text-warning">
          Only a super admin can change permissions. You can view them here.
        </p>
      )}

      {query.isLoading ? (
        <p className="text-body text-ink-muted">Loading permissions…</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <Switch
              id="staff-super-admin"
              label="Super admin (can do everything, including managing staff)"
              checked={isSuper}
              disabled={!canEdit || (isSelf && isSuper)}
              onChange={(e) => setIsSuper(e.target.checked)}
            />
            {isSelf && isSuper && (
              <p className="mt-2 text-caption text-ink-muted">You can't remove your own super admin access.</p>
            )}
          </div>

          {groups.map(([group, perms]) => (
            <fieldset key={group} disabled={!canEdit || isSuper} className="space-y-2">
              <legend className="mb-2 text-caption font-semibold uppercase tracking-wide text-ink-muted">{group}</legend>
              {perms.map((p) => (
                <Checkbox
                  key={p.key}
                  id={`perm-${p.key}`}
                  label={p.label}
                  checked={isSuper || selected.has(p.key)}
                  onChange={() => toggle(p.key)}
                />
              ))}
            </fieldset>
          ))}
          {isSuper && <p className="text-caption text-ink-muted">Super admins hold every permission automatically.</p>}
        </div>
      )}
    </Drawer>
  );
}

function CreateStaffDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: StaffUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
    }
  }, [open]);

  const create = useMutation({
    mutationFn: () => adminApi.post<{ id: number }>("/users", { name, email, password, role: "admin" }),
    onSuccess: (data) => {
      showSuccess("Staff member added. Now choose what they can do.");
      onCreated({
        id: data.id,
        name,
        email,
        role: "admin",
        is_super_admin: false,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not add the staff member."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add staff member"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!name || !email || password.length < 8}>
            Add staff member
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="block space-y-1">
          <span className="text-body font-medium text-ink">Full name</span>
          <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="block space-y-1">
          <span className="text-body font-medium text-ink">Email</span>
          <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </label>
        <label className="block space-y-1">
          <span className="text-body font-medium text-ink">Temporary password</span>
          <Input id="staff-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <span className="text-caption text-ink-muted">At least 8 characters. Share it with them privately.</span>
        </label>
        <p className="text-caption text-ink-muted">New staff start with no special permissions. You choose them next.</p>
      </form>
    </Drawer>
  );
}

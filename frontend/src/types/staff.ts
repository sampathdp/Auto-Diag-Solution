export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "customer";
  is_super_admin: number | boolean;
  is_active: number | boolean;
  created_at: string;
}

export interface PermissionDefinition {
  key: string;
  label: string;
  group: string;
}

export interface StaffPermissions {
  user_id: number;
  role: string;
  is_super_admin: boolean;
  permissions: string[];
}

export interface OutboxEmail {
  id: number;
  channel: "email";
  recipient: string;
  subject: string;
  template: string | null;
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  attempts: number;
  last_error: string | null;
  available_at: string;
  sent_at: string | null;
  created_at: string;
}

export interface OutboxResponse {
  items: OutboxEmail[];
  meta: { total: number; current_page: number; per_page: number; total_pages: number };
  summary: Record<OutboxEmail["status"], number>;
  oldest_pending_at: string | null;
}

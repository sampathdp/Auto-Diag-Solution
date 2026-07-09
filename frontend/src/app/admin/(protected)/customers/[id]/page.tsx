"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Home, Mail, Phone, ShoppingBag, TrendingUp, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Switch } from "@/components/admin/ui/Switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { DataTable } from "@/components/admin/DataTable";
import { NotesPanel } from "@/components/admin/NotesPanel";
import { showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED, formatDate, formatDateTime } from "@/lib/admin/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Customer, CustomerAddress, Order } from "@/mocks/admin/db";

const orderColumns: ColumnDef<Order, any>[] = [
  { accessorKey: "order_number", header: "Order #" },
  { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
  {
    id: "items_count",
    header: "Items",
    cell: ({ row }) => row.original.items.reduce((sum, it) => sum + it.quantity, 0),
  },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatAED(row.original.total) },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const customerQuery = useAdminQuery<Customer>(adminQueryKeys.customers.detail(id), `/customers/${id}`);
  const customer = customerQuery.data;

  const ordersQuery = useAdminQuery<PaginatedResponse<Order>>(
    adminQueryKeys.orders.list({ customer_id: id, per_page: 100 }),
    "/orders",
    { customer_id: id, per_page: 100 }
  );
  const addressesQuery = useAdminQuery<CustomerAddress[]>(
    adminQueryKeys.customers.addresses(id),
    `/customers/${id}/addresses`
  );

  const orders = ordersQuery.data?.items ?? [];
  const lastOrderDate = orders[0]?.created_at;
  const avgOrderValue = customer && customer.orders_count > 0 ? customer.total_spent / customer.orders_count : 0;

  const toggleBlocked = useMutation({
    mutationFn: (status: "active" | "blocked") => adminApi.patch(`/customers/${id}`, { status }),
    onSuccess: () => {
      showSuccess("Customer updated");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.customers.detail(id) });
    },
  });

  const addNote = useMutation({
    mutationFn: (text: string) => adminApi.post(`/customers/${id}/notes`, { text }),
    onSuccess: () => {
      showSuccess("Note added");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.customers.detail(id) });
    },
  });

  if (customerQuery.isLoading) return <FullScreenLoader label="Loading customer…" />;
  if (!customer) return <EmptyState icon={UserIcon} title="Customer not found" message="It may have been deleted." />;

  return (
    <div>
      <PageHeader
        title={customer.name}
        breadcrumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customer.name }]}
        actions={<StatusBadge status={customer.status} />}
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-body text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {customer.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </span>
          </div>
          <Switch
            label={customer.status === "blocked" ? "Blocked" : "Active"}
            checked={customer.status !== "blocked"}
            onChange={(e) => toggleBlocked.mutate(e.target.checked ? "active" : "blocked")}
          />
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={String(customer.orders_count)} icon={ShoppingBag} />
        <StatCard label="Total Spent" value={formatAED(customer.total_spent)} icon={DollarSign} />
        <StatCard label="Average Order Value" value={formatAED(Math.round(avgOrderValue))} icon={TrendingUp} />
        <StatCard label="Last Order" value={lastOrderDate ? formatDate(lastOrderDate) : "—"} icon={Home} />
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <DataTable
            columns={orderColumns}
            data={orders}
            isLoading={ordersQuery.isLoading}
            emptyState={{ icon: ShoppingBag, title: "No orders yet" }}
          />
        </TabsContent>

        <TabsContent value="addresses" className="space-y-3">
          {addressesQuery.isLoading ? (
            <p className="text-body text-ink-muted">Loading…</p>
          ) : (addressesQuery.data ?? []).length === 0 ? (
            <EmptyState icon={Home} title="No saved addresses" />
          ) : (
            (addressesQuery.data ?? []).map((address) => (
              <Card key={address.id}>
                <CardBody className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium text-ink">
                      {address.label}
                      {address.is_default && <StatusBadge status="active" />}
                    </p>
                    <p className="mt-1 text-body text-ink-muted">
                      {address.building}
                      {address.apartment ? `, ${address.apartment}` : ""}, {address.street_address}
                      <br />
                      {address.area}, {address.city}, {address.emirate}
                    </p>
                    <p className="mt-1 text-caption text-ink-muted">{address.phone}</p>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <h2 className="text-h4 font-bold text-ink">Profile</h2>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Full Name</dt>
                  <dd className="mt-1 text-body text-ink">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Email</dt>
                  <dd className="mt-1 text-body text-ink">{customer.email}</dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Phone</dt>
                  <dd className="mt-1 text-body text-ink">{customer.phone}</dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Emirate / City</dt>
                  <dd className="mt-1 text-body text-ink">
                    {customer.emirate}, {customer.city}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Joined</dt>
                  <dd className="mt-1 text-body text-ink">{formatDateTime(customer.created_at)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-caption text-ink-muted">
                Read-only — synced from the customer&apos;s storefront account. Admins cannot edit customer profiles here.
              </p>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <NotesPanel notes={customer.internal_notes} onAdd={(text) => addNote.mutate(text)} adding={addNote.isPending} />
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Link href="/admin/customers" className="text-caption font-semibold text-primary hover:underline">
          ← Back to all customers
        </Link>
      </div>
    </div>
  );
}

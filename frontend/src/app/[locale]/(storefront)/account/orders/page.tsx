"use client";

import { useState, useEffect } from "react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { OrderCard } from "@/components/account/OrderCard";
import apiClient from "@/lib/api/client";
import type { Order } from "@/types/order";
import { Search, Loader2, PackageX, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReorderModal } from "@/components/account/ReorderModal";

export default function OrdersPage() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderId, setReorderId] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch orders when filters change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: "10",
      status: statusFilter,
      date_range: dateRange,
      ...(debouncedSearch && { q: debouncedSearch })
    });

    apiClient.get(`/account/orders?${params.toString()}`)
      .then(res => {
        const data = res.data.data;
        if (data) {
          setOrders(data.items || []);
          setTotalPages(data.meta?.total_pages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, dateRange, debouncedSearch, page]);

  const handleReorderClick = (id: number) => {
    setReorderId(id);
    setReorderModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <AccountPageHeader
        title="Order History"
        subtitle="View your past orders, download invoices, and reorder items."
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Filters */}
        <div className="flex w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 gap-2">
          {[
            { id: "all", label: "All Orders" },
            { id: "processing", label: "Processing" },
            { id: "shipped", label: "Shipped" },
            { id: "delivered", label: "Delivered" },
            { id: "cancelled", label: "Cancelled" },
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => { setStatusFilter(status.id); setPage(1); }}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                statusFilter === status.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Search & Date Filter */}
        <div className="flex w-full md:w-auto gap-2">
          <select 
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
            className="h-10 rounded-md border bg-background px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">All Time</option>
            <option value="30_days">Last 30 Days</option>
            <option value="3_months">Last 3 Months</option>
            <option value="1_year">Last Year</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="min-h-[400px] relative">
        {loading && orders.length === 0 ? (
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-card border" />
            ))}
          </div>
        ) : null}
        
        {loading && orders.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}

        <AnimatePresence mode="popLayout">
          {orders.length > 0 ? (
            <motion.div layout className="flex flex-col gap-4">
              {orders.map((order, idx) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onReorder={handleReorderClick}
                  index={idx}
                />
              ))}
            </motion.div>
          ) : !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <PackageX className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">No orders found</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                We couldn't find any orders matching your current filters. Try adjusting them or clear your search.
              </p>
              <button 
                onClick={() => {
                  setStatusFilter("all");
                  setDateRange("all");
                  setSearch("");
                }}
                className="mt-6 font-semibold text-primary hover:underline"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {reorderModalOpen && (
        <ReorderModal 
          isOpen={reorderModalOpen}
          onClose={() => setReorderModalOpen(false)}
          orderId={reorderId!}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Package, Truck, Car, Heart, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/account/StatCard";
import { StatusBadge } from "@/components/account/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";

export default function AccountOverviewPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<{
    vehicles: any[];
    orders: any[];
    wishlist: any[];
    loading: boolean;
  }>({
    vehicles: [],
    orders: [],
    wishlist: [],
    loading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, ordersRes, wishlistRes] = await Promise.all([
          apiClient.get("/account/vehicles"),
          apiClient.get("/account/orders?per_page=3"),
          apiClient.get("/account/wishlist"),
        ]);
        
        setData({
          vehicles: vehiclesRes.data.data || [],
          orders: ordersRes.data.data?.items || [],
          wishlist: wishlistRes.data.data || [],
          loading: false,
        });
      } catch (error) {
        console.error("Failed to fetch account overview data", error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchData();
  }, []);

  const defaultVehicle = data.vehicles.find(v => v.is_default) || data.vehicles[0];
  const inTransitOrders = data.orders.filter(o => ["processing", "shipped"].includes(o.status));

  if (data.loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome, {user?.name?.split(" ")[0] || "Customer"}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your orders, vehicles, and account preferences here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={data.orders.length}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="In Transit"
          value={inTransitOrders.length}
          icon={<Truck className="h-5 w-5" />}
        />
        <StatCard
          label="Saved Vehicles"
          value={data.vehicles.length}
          icon={<Car className="h-5 w-5" />}
        />
        <StatCard
          label="Wishlist Items"
          value={data.wishlist.length}
          icon={<Heart className="h-5 w-5" />}
        />
      </div>

      {defaultVehicle && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col md:flex-row">
            <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Active Vehicle
              </h3>
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                Shop parts for your {defaultVehicle.year} {defaultVehicle.make} {defaultVehicle.model}
              </h2>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/shop" className="w-fit">
                    Browse Parts
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/account/vehicles" className="w-fit">
                    Manage Vehicles
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden bg-muted md:flex md:w-1/3 items-center justify-center border-l">
              <Car className="h-32 w-32 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Orders</h2>
          <Link
            href="/account/orders"
            className="flex items-center text-sm font-medium text-primary hover:underline"
          >
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {data.orders.length > 0 ? (
            <div className="divide-y">
              {data.orders.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{order.order_number}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold">AED {order.total_amount.toFixed(2)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/account/orders/${order.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              You haven't placed any orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

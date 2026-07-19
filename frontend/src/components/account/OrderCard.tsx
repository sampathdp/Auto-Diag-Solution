"use client";

import type { Order } from "@/types/order";
import { Link } from "@/i18n/navigation";
import { useFormatter } from "next-intl";
import { motion } from "framer-motion";
import { ChevronRight, FileText, RotateCcw, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderStatusClassName, getOrderStatusLabel } from "@/lib/orderStatus";
import toast from "react-hot-toast";

interface OrderCardProps {
  order: Order;
  onReorder: (orderId: number) => void;
  index?: number;
}

export function OrderCard({ order, onReorder, index = 0 }: OrderCardProps) {
  const format = useFormatter();
  const items = order.items ?? [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.success("Invoice downloading...");
  };

  const handleReorder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onReorder(order.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="group"
    >
      <Link 
        href={`/account/orders/${order.id}`}
        className="block rounded-xl border bg-card p-4 md:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          
          {/* Left: Order Info */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">
                #{order.order_number}
              </span>
              <span className="text-xs text-muted-foreground">
                • {format.dateTime(new Date(order.created_at), { dateStyle: "medium" })}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Middle: Images & Products */}
          <div className="flex-[1.5] flex items-center gap-4">
            <div className="flex -space-x-3">
              {items.slice(0, 3).map((item, i) => (
                <div
                  key={i}
                  className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-card bg-white shrink-0 shadow-sm"
                  style={{ zIndex: 3 - i }}
                >
                  <img src={item.image ?? undefined} alt="" className="h-full w-full object-contain p-1" />
                </div>
              ))}
              {items.length > 3 && (
                <div className="relative z-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-bold shadow-sm">
                  +{items.length - 3}
                </div>
              )}
            </div>
            <div className="hidden sm:block">
              {items[0] && (
                <p className="line-clamp-1 text-sm font-medium">
                  {items[0].name_en} {items.length > 1 && <span className="text-muted-foreground font-normal">+{items.length - 1} more</span>}
                </p>
              )}
            </div>
          </div>

          {/* Right: Totals & Status */}
          <div className="flex-1 flex flex-col md:items-end justify-center gap-2">
            <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4">
              <div className="text-right">
                <div className="font-bold text-base md:text-lg">AED {order.total_amount.toFixed(2)}</div>
              </div>
              <div className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", getOrderStatusClassName(order.status))}>
                {getOrderStatusLabel(order.status)}
              </div>
            </div>
            {order.status === "shipped" && (
              <div className="text-xs font-medium text-info flex items-center gap-1">
                <Package className="w-3 h-3" /> Arriving soon
              </div>
            )}
          </div>
          
          {/* Quick Actions (Desktop Hover, Mobile Always) */}
          <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
            <button 
              onClick={handleReorder}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reorder
            </button>
            <button 
              onClick={handleDownload}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" /> Invoice
            </button>
            <div className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground shrink-0">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

        </div>
      </Link>
    </motion.div>
  );
}

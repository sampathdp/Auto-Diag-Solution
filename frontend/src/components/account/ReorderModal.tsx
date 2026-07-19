"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/api/client";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
}

interface ReorderableItem {
  product_id: number;
  quantity: number;
}

export function ReorderModal({ isOpen, onClose, orderId }: ReorderModalProps) {
  const addToCart = useCartStore(state => state.addItem);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<"confirm" | "warning" | "success">("confirm");
  const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<ReorderableItem[]>([]);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);
    };
  }, []);

  const handleInitialCheck = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/account/orders/${orderId}/reorder`);
      const data = res.data.data;
      if (data?.out_of_stock?.length > 0) {
        setOutOfStockItems(data.out_of_stock);
        setAddedCount(data.cart_items);
        setPendingItems(data.added || []);
        setState("warning");
      } else {
        (data?.added || []).forEach((item: ReorderableItem) => addToCart(String(item.product_id), item.quantity));
        setAddedCount(data?.cart_items || 0);
        handleSuccess();
      }
    } catch (err) {
      toast.error("Failed to reorder. Please try again.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setState("success");
    successTimeoutRef.current = setTimeout(() => {
      toast.success("Items added to cart");
      onClose();
    }, 1500);
  };

  const handleProceedPartial = () => {
    setLoading(true);
    pendingItems.forEach((item) => addToCart(String(item.product_id), item.quantity));
    partialTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      handleSuccess();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-xl pointer-events-auto"
            >
              {state === "confirm" && (
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-lg font-bold">Reorder Items</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    This will check availability and add all items from order #{orderId} to your cart. Do you want to proceed?
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleInitialCheck} disabled={loading} className="w-32">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check Availability"}
                    </Button>
                  </div>
                </div>
              )}

              {state === "warning" && (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4 text-warning-foreground">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold">Partial Availability</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {addedCount} items are available, but the following items are currently out of stock:
                  </p>
                  <ul className="list-disc pl-5 text-sm text-foreground mb-6 space-y-1">
                    {outOfStockItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium mb-6">
                    Add the available items to your cart?
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleProceedPartial} disabled={loading} className="w-32">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Available"}
                    </Button>
                  </div>
                </div>
              )}

              {state === "success" && (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="mb-4 text-success"
                  >
                    <CheckCircle2 className="h-16 w-16" />
                  </motion.div>
                  <h2 className="text-xl font-bold mb-2">Added to Cart!</h2>
                  <p className="text-sm text-muted-foreground">
                    Redirecting...
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { SideDrawer } from "@/components/account/SideDrawer";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Order } from "@/types/order";
import { Button } from "@/components/ui/Button";
import { Loader2, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/api/client";

const refundSchema = z.object({
  reason: z.string().min(1, "Please select a reason"),
  description: z.string().min(10, "Please provide more details (min 10 characters)"),
  items: z.array(z.string()).min(1, "Select at least one item to refund"),
});

type RefundForm = z.infer<typeof refundSchema>;

interface RefundDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onSuccess: () => void;
}

const REASONS = [
  "Item arrived damaged",
  "Wrong item sent",
  "Item doesn't match description",
  "Changed my mind",
  "Other"
];

export function RefundDrawer({ isOpen, onClose, order, onSuccess }: RefundDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<RefundForm>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      items: [],
      reason: "",
      description: ""
    }
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Mock upload - just create object URLs
      const newPhotos = Array.from(e.target.files).map(f => URL.createObjectURL(f));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: RefundForm) => {
    setLoading(true);
    try {
      await apiClient.post(`/account/orders/${order.id}/refund`, data);
      toast.success("Refund request submitted successfully");
      onSuccess();
    } catch (err) {
      toast.error("Failed to submit refund request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideDrawer
      open={isOpen}
      onOpenChange={(v) => { if (!v) onClose(); }}
      title="Request Refund"
    >
      <div className="mb-6 text-sm text-muted-foreground">Order #{order.order_number}</div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="space-y-3">
          <label className="text-sm font-semibold">Which items would you like to return?</label>
          {errors.items && <p className="text-xs text-destructive">{errors.items.message}</p>}
          <div className="flex flex-col gap-2">
            {order.items.map((item) => (
              <label key={item.sku} className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-secondary/50">
                <input 
                  type="checkbox" 
                  value={item.sku}
                  {...register("items")}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <img src={item.image ?? undefined} alt="" className="h-10 w-10 object-contain bg-white rounded border p-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{item.name_en}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Reason for return</label>
          <select 
            {...register("reason")}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Select a reason...</option>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Description</label>
          <textarea 
            {...register("description")}
            rows={4}
            placeholder="Please provide more details about the issue..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Photos (Optional)</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative h-20 w-20 rounded-md border overflow-hidden">
                <img src={p} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed hover:bg-secondary/50">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Upload</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t mt-auto">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Request"}
          </Button>
        </div>
      </form>
    </SideDrawer>
  );
}

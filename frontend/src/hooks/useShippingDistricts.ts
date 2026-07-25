import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";

export interface ShippingDistrict {
  id: number;
  name: string;
  rate: number | null;
  free_shipping_threshold: number | null;
}

/** Active districts + their rate — feeds the district picker on the account address form
 * and guest checkout, and lets the checkout page price shipping before the order is placed. */
export function useShippingDistricts() {
  return useQuery({
    queryKey: ["shipping", "districts"],
    queryFn: async () => (await storefrontApi.get<{ items: ShippingDistrict[] }>("/shipping/districts")).items,
    staleTime: 60000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";

type VehicleFiltersResponse = {
  years: number[];
  makes: string[];
  models: string[];
};

/** Cascading Year -> Make -> Model options for the shop's "check fitment" dropdown. */
export function useVehicleFilters(year?: string, make?: string) {
  return useQuery({
    queryKey: ["vehicle-filters", year, make],
    queryFn: async () => {
      const res = await storefrontApi.get<VehicleFiltersResponse>("/vehicles/filters", {
        year: year || undefined,
        make: make || undefined,
      });
      return {
        years: res.years.map(String),
        makes: res.makes,
        models: res.models,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

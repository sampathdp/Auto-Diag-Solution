import type { Product } from "@/types/storefront";

type VehicleLike = {
  year?: string | number | null;
  make?: string | null;
  model?: string | null;
};

/** Universal parts (fits_all_vehicles) always match; otherwise checks compatible_vehicles. */
export function productFitsVehicle(
  product: Pick<Product, "fits_all_vehicles" | "compatible_vehicles">,
  vehicle: VehicleLike
): boolean {
  if (product.fits_all_vehicles) return true;
  return product.compatible_vehicles.some(
    (v) =>
      (!vehicle.year || v.year.toString() === vehicle.year.toString()) &&
      (!vehicle.make || v.make.toLowerCase() === vehicle.make.toLowerCase()) &&
      (!vehicle.model || v.model.toLowerCase() === vehicle.model.toLowerCase())
  );
}

/** Real backend shape (backend/app/Services/ShippingService.php). Districts and rates are
 * managed as separate resources — a district can exist unpriced (falls back to the flat
 * default rate in checkout) while a rate always belongs to exactly one district. */
export interface ShippingDistrict {
  id: number;
  name: string;
  is_active: boolean;
  rate: number | null;
  free_shipping_threshold: number | null;
  address_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  id: number;
  district_id: number;
  district_name: string;
  rate: number;
  free_shipping_threshold: number | null;
  created_at: string;
  updated_at: string;
}

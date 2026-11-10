import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";

export interface PublicAnnouncementData {
  announcement_en?: string;
  announcement_ar?: string;
  contact_address_en?: string;
  contact_address_ar?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_hours_en?: string;
  contact_hours_ar?: string;
  contact_blurb_en?: string;
  contact_blurb_ar?: string;
  whatsapp_number?: string;
}

export function useContactInfo() {
  return useQuery({
    queryKey: ["site-announcement-contact"],
    queryFn: () => storefrontApi.get<PublicAnnouncementData>("/announcement"),
    staleTime: 60 * 1000,
    retry: false,
  });
}


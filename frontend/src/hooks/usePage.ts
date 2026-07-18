import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";
import type { Page } from "@/types/page";

export function usePage(slug: string) {
  return useQuery({
    queryKey: ["page", slug],
    queryFn: () => storefrontApi.get<Page>(`/pages/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

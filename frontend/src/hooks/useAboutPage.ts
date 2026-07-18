import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";
import type { AboutPage } from "@/types/aboutPage";

export function useAboutPage() {
  return useQuery({
    queryKey: ["about-page"],
    queryFn: () => storefrontApi.get<AboutPage>("/about-page"),
    retry: false,
  });
}

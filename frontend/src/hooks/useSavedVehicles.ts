import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";

export function useSavedVehicles() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [savedVehicles, setSavedVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .get("/account/vehicles")
        .then((res) => {
          if (res.data?.data) setSavedVehicles(res.data.data);
        })
        .catch(console.error);
    }
  }, [isAuthenticated]);

  return { savedVehicles, isAuthenticated };
}

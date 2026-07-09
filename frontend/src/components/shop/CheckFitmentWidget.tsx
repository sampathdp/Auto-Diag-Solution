"use client";

import { useState, useEffect } from "react";
import { useVehicleStore } from "@/store/useVehicleStore";
import { Product } from "@/mocks/storefront/types";
import { CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useSavedVehicles } from "@/hooks/useSavedVehicles";
import { useTranslations } from "next-intl";

interface CheckFitmentWidgetProps {
  product: Product;
}

export function CheckFitmentWidget({ product }: CheckFitmentWidgetProps) {
  const t = useTranslations("shop.checkFitment");
  const globalVehicle = useVehicleStore(state => state.vehicle);
  const { savedVehicles, isAuthenticated } = useSavedVehicles();

  const [selectedVehicle, setSelectedVehicle] = useState<any>(globalVehicle);

  useEffect(() => {
    setSelectedVehicle(globalVehicle);
  }, [globalVehicle]);

  if (!selectedVehicle) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-semibold mb-2">{t("title")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("prompt")}</p>
        {isAuthenticated && savedVehicles.length > 0 ? (
          <div className="relative max-w-[250px]">
            <select
              defaultValue=""
              onChange={(e) => {
                const v = savedVehicles.find(sv => sv.id.toString() === e.target.value);
                if (v) setSelectedVehicle(v);
              }}
              className="w-full appearance-none rounded-md border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>{t("selectSaved")}</option>
              {savedVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.nickname || `${v.year} ${v.make} ${v.model}`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        ) : (
          <Link href="/account/vehicles" className="text-sm font-semibold text-primary hover:underline">
            {t("selectVehicle")}
          </Link>
        )}
      </div>
    );
  }

  const fitsPerfectly = product.compatible_vehicles.some(v => 
    v.year.toString() === selectedVehicle.year?.toString() &&
    v.make.toLowerCase() === selectedVehicle.make?.toLowerCase() &&
    v.model.toLowerCase() === selectedVehicle.model?.toLowerCase()
  );

  return (
    <div className={cn(
      "rounded-lg border p-4 shadow-sm transition-colors",
      fitsPerfectly ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
    )}>
      <div className="flex items-start gap-3">
        {fitsPerfectly ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
        )}
        
        <div className="flex-1">
          <h3 className={cn("font-bold text-sm", fitsPerfectly ? "text-success-foreground" : "text-destructive-foreground")}>
            {fitsPerfectly ? t("fitsPerfectly") : t("doesNotFit")}
          </h3>
          <p className="text-sm font-medium mt-0.5">
            {selectedVehicle.nickname || `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
          </p>
          
          {isAuthenticated && savedVehicles.length > 1 && (
            <div className="mt-4 relative max-w-[250px]">
              <select
                value={selectedVehicle.id || ""}
                onChange={(e) => {
                  const v = savedVehicles.find(sv => sv.id.toString() === e.target.value);
                  if (v) setSelectedVehicle(v);
                }}
                className="w-full appearance-none rounded-md border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {savedVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {t("tryVehicle", { vehicle: v.nickname || `${v.year} ${v.make} ${v.model}` })}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

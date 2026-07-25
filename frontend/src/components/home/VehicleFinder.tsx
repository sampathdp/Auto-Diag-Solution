"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useVehicleFilters } from "@/hooks/useVehicleFilters";

function SelectField({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled,
  loading,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-white/70">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`h-[52px] w-full appearance-none rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
            value ? "font-semibold text-white" : "font-medium text-white/50"
          }`}
        >
          <option value="" className="bg-[#1E2530] text-white/50">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o} className="bg-[#1E2530] text-white">
              {o}
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2 className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/50" />
        ) : (
          <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        )}
      </div>
    </div>
  );
}

import { useRouter } from "@/i18n/navigation";
import { useVehicleStore } from "@/store/useVehicleStore";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";
import { useEffect } from "react";

export function VehicleFinder() {
  const t = useTranslations("home.finder");
  const router = useRouter();
  const setVehicleStore = useVehicleStore(state => state.setVehicle);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const [savedVehicles, setSavedVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get("/account/vehicles").then(res => {
        if (res.data?.data) {
          setSavedVehicles(res.data.data);
        }
      }).catch(console.error);
    }
  }, [isAuthenticated]);

  const { data: vehicleOptions, isLoading: isLoadingOptions } = useVehicleFilters(year, make);
  const years = vehicleOptions?.years || [];
  const makes = year ? vehicleOptions?.makes || [] : [];
  const models = year && make ? vehicleOptions?.models || [] : [];

  const handleSubmit = () => {
    if (year || make || model) {
      setVehicleStore({ year, make, model });
      const params = new URLSearchParams();
      if (year) params.set("fits_year", year);
      if (make) params.set("fits_make", make);
      if (model) params.set("fits_model", model);
      router.push(`/shop?${params.toString()}`);
    } else {
      router.push("/shop");
    }
  };

  const handleSavedVehicleSelect = (idStr: string) => {
    if (!idStr) return;
    const v = savedVehicles.find(sv => sv.id.toString() === idStr);
    if (v) {
      setVehicleStore({
        id: v.id,
        year: v.year.toString(),
        make: v.make,
        model: v.model,
        trim: v.trim,
        nickname: v.nickname,
      });
      const params = new URLSearchParams();
      params.set("fits_year", v.year.toString());
      params.set("fits_make", v.make);
      params.set("fits_model", v.model);
      router.push(`/shop?${params.toString()}`);
    }
  };

  return (
    <div
      id="finder"
      className="relative z-[3] mt-16 max-w-[980px] rounded-2xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="text-[13px] font-extrabold uppercase tracking-widest text-white/70">
          {t("title")}
        </div>
        {isAuthenticated && savedVehicles.length > 0 && (
          <div className="relative">
            <select
              onChange={(e) => handleSavedVehicleSelect(e.target.value)}
              className="appearance-none rounded border border-white/20 bg-white/10 px-3 py-1.5 pr-8 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" className="text-black">Use one of my saved vehicles ▾</option>
              {savedVehicles.map(v => (
                <option key={v.id} value={v.id} className="text-black">
                  {v.nickname || `${v.year} ${v.make} ${v.model}`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[1fr_1fr_1fr_auto]">
        <SelectField
          label={t("year")}
          placeholder={t("yearPlaceholder")}
          value={year}
          onChange={(v) => {
            setYear(v);
            setMake("");
            setModel("");
          }}
          options={years}
          disabled={isLoadingOptions && years.length === 0}
          loading={isLoadingOptions && years.length === 0}
        />
        <SelectField
          label={t("make")}
          placeholder={t("makePlaceholder")}
          value={make}
          onChange={(v) => {
            setMake(v);
            setModel("");
          }}
          options={makes}
          disabled={!year}
        />
        <SelectField
          label={t("model")}
          placeholder={t("modelPlaceholder")}
          value={model}
          onChange={setModel}
          options={models}
          disabled={!make}
        />
        <div className="flex items-end">
          <Button onClick={handleSubmit} className="h-[52px] w-full md:w-auto">{t("submit")}</Button>
        </div>
      </div>
    </div>
  );
}

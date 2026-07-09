"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Placeholder fitment data — will be replaced by a live vehicles/product_vehicle API call.
const VEHICLE_DATA: Record<string, Record<string, string[]>> = {
  "2024": {
    Toyota: ["Land Cruiser", "Hilux", "Camry", "Corolla"],
    Nissan: ["Patrol", "Altima", "X-Trail"],
    Ford: ["F-150", "Explorer"],
    Honda: ["Accord", "CR-V"],
  },
  "2022": {
    Toyota: ["Land Cruiser", "Hilux", "Camry", "Corolla"],
    Nissan: ["Patrol", "Altima", "X-Trail"],
    Ford: ["F-150", "Explorer"],
    Honda: ["Accord", "CR-V"],
  },
  "2020": {
    Toyota: ["Land Cruiser", "Hilux", "Camry", "Corolla"],
    Nissan: ["Patrol", "Altima", "X-Trail"],
    Ford: ["F-150", "Explorer"],
    Honda: ["Accord", "CR-V"],
  },
  "2019": {
    Toyota: ["Land Cruiser", "Hilux", "Camry", "Corolla"],
    Nissan: ["Patrol", "Altima", "X-Trail"],
    Ford: ["F-150", "Explorer"],
    Honda: ["Accord", "CR-V"],
  },
  "2017": {
    Toyota: ["Land Cruiser", "Hilux", "Camry", "Corolla"],
    Nissan: ["Patrol", "Altima", "X-Trail"],
    Ford: ["F-150", "Explorer"],
    Honda: ["Accord", "CR-V"],
  },
  "2015": {
    Toyota: ["Land Cruiser", "Hilux", "Camry", "Corolla"],
    Nissan: ["Patrol", "Altima", "X-Trail"],
    Ford: ["F-150", "Explorer"],
    Honda: ["Accord", "CR-V"],
  },
};

const YEARS = Object.keys(VEHICLE_DATA).sort().reverse();

function SelectField({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-foreground/62">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`h-[52px] w-full appearance-none rounded-md border border-border bg-secondary px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed ${
            value ? "font-semibold text-foreground" : "font-medium text-foreground/62"
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/62" />
      </div>
    </div>
  );
}

export function VehicleFinder() {
  const t = useTranslations("home.finder");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const makes = year ? Object.keys(VEHICLE_DATA[year]) : [];
  const models = year && make ? VEHICLE_DATA[year][make] : [];

  return (
    <div
      id="finder"
      className="relative z-[3] mt-16 max-w-[980px] rounded-xl bg-card p-8 shadow-lifted"
    >
      <div className="mb-5 text-[13px] font-extrabold uppercase tracking-widest text-foreground/62">
        {t("title")}
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
          options={YEARS}
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
          <Button className="h-[52px] w-full md:w-auto">{t("submit")}</Button>
        </div>
      </div>
    </div>
  );
}

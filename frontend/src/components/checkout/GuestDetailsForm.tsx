"use client";

import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/Input";
import { useShippingDistricts } from "@/hooks/useShippingDistricts";

export interface GuestDetailsValue {
  name: string;
  email: string;
  phone: string;
  emirate: string;
  district_id: number | null;
  area: string;
  building: string;
  apartment: string;
  street: string;
  instructions: string;
}

const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

export function GuestDetailsForm({
  value,
  onChange,
}: {
  value: GuestDetailsValue;
  onChange: (value: GuestDetailsValue) => void;
}) {
  const set = <K extends keyof GuestDetailsValue>(key: K, v: GuestDetailsValue[K]) =>
    onChange({ ...value, [key]: v });

  const { data: districts = [] } = useShippingDistricts();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Checking out as a guest.{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Log in
        </Link>{" "}
        if you have an account, or fill in your details below to continue.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Full Name</label>
          <Input value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Phone Number</label>
          <Input value={value.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 5X XXX XXXX" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Emirate</label>
          <select
            value={value.emirate}
            onChange={(e) => set("emirate", e.target.value)}
            className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-ring/20 focus:border-primary"
          >
            {EMIRATES.map((emirate) => (
              <option key={emirate} value={emirate}>
                {emirate}
              </option>
            ))}
          </select>
        </div>

        {districts.length > 0 && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">District (Optional)</label>
            <select
              value={value.district_id ?? ""}
              onChange={(e) => set("district_id", e.target.value ? Number(e.target.value) : null)}
              className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-ring/20 focus:border-primary"
            >
              <option value="">Standard rate</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Area / Neighborhood</label>
          <Input value={value.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Al Barsha" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Building Name/No.</label>
          <Input value={value.building} onChange={(e) => set("building", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Apartment/Floor (Optional)</label>
          <Input value={value.apartment} onChange={(e) => set("apartment", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Street (Optional)</label>
          <Input value={value.street} onChange={(e) => set("street", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Delivery Instructions (Optional)</label>
          <textarea
            value={value.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            rows={3}
            className="flex w-full resize-none rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-ring/20 focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}

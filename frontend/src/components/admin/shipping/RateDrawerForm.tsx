"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { RateFormSchema, RATE_FORM_DEFAULTS, type RateFormValues } from "@/lib/admin/schemas/shippingSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import type { PaginatedResponse } from "@/types/api";
import type { ShippingDistrict, ShippingRate } from "@/types/shipping";

export function RateDrawerForm({
  open,
  onClose,
  rate,
}: {
  open: boolean;
  onClose: () => void;
  /** Present = editing; absent = creating. */
  rate?: ShippingRate | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!rate;

  const districtsQuery = useAdminQuery<PaginatedResponse<ShippingDistrict>>(
    adminQueryKeys.shipping.allDistricts,
    "/shipping/districts",
    { per_page: 1000 }
  );
  // Only unpriced districts can start a new rate — a priced one is edited from its
  // existing row instead (one rate per district, enforced server-side too).
  const availableDistricts = useMemo(
    () => (districtsQuery.data?.items ?? []).filter((d) => d.rate === null),
    [districtsQuery.data]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RateFormValues>({
    resolver: zodResolver(RateFormSchema),
    defaultValues: RATE_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        rate
          ? { district_id: rate.district_id, rate: rate.rate, free_shipping_threshold: rate.free_shipping_threshold ?? "" }
          : RATE_FORM_DEFAULTS
      );
    }
  }, [open, rate, reset]);

  const save = useMutation({
    mutationFn: (values: RateFormValues) => {
      const payload = {
        district_id: values.district_id,
        rate: values.rate,
        free_shipping_threshold: values.free_shipping_threshold === "" ? null : values.free_shipping_threshold,
      };
      return isEdit && rate ? adminApi.put(`/shipping/rates/${rate.id}`, payload) : adminApi.post("/shipping/rates", payload);
    },
    onSuccess: () => {
      showSuccess(isEdit ? "Rate updated" : "Rate created");
      queryClient.invalidateQueries({ queryKey: ["admin", "shipping"] });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the rate."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Rate" : "Add Rate"}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rate-form" loading={save.isPending}>
            {isEdit ? "Save Changes" : "Create Rate"}
          </Button>
        </>
      }
    >
      <form id="rate-form" onSubmit={handleSubmit((values) => save.mutate(values), onFormInvalid)} className="space-y-4">
        {isEdit ? (
          <FormField label="District">
            <Input value={rate?.district_name ?? ""} disabled />
          </FormField>
        ) : (
          <FormField label="District" htmlFor="rate-district" error={errors.district_id?.message} required>
            <Select id="rate-district" {...register("district_id")} error={!!errors.district_id}>
              <option value={0}>Select a district…</option>
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            {availableDistricts.length === 0 && (
              <p className="mt-1.5 text-caption text-ink-muted">
                Every district already has a rate — add a new district on the Districts tab first.
              </p>
            )}
          </FormField>
        )}

        <FormField label="Delivery Fee (AED)" htmlFor="rate-amount" error={errors.rate?.message} required>
          <Input id="rate-amount" type="number" step="0.01" min="0" placeholder="20.00" {...register("rate")} />
        </FormField>

        <FormField
          label="Free Shipping Threshold (AED)"
          htmlFor="rate-threshold"
          error={errors.free_shipping_threshold?.message}
        >
          <Input
            id="rate-threshold"
            type="number"
            step="0.01"
            min="0"
            placeholder="Leave blank to use the site-wide default (AED 500)"
            {...register("free_shipping_threshold")}
          />
        </FormField>
      </form>
    </Drawer>
  );
}

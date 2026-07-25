"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Switch } from "@/components/admin/ui/Switch";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { DistrictFormSchema, DISTRICT_FORM_DEFAULTS, type DistrictFormValues } from "@/lib/admin/schemas/shippingSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import type { ShippingDistrict } from "@/types/shipping";

export function DistrictDrawerForm({
  open,
  onClose,
  district,
}: {
  open: boolean;
  onClose: () => void;
  /** Present = editing; absent = creating. */
  district?: ShippingDistrict | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!district;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DistrictFormValues>({
    resolver: zodResolver(DistrictFormSchema),
    defaultValues: DISTRICT_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(district ? { name: district.name, is_active: district.is_active } : DISTRICT_FORM_DEFAULTS);
    }
  }, [open, district, reset]);

  const save = useMutation({
    mutationFn: (values: DistrictFormValues) =>
      isEdit && district
        ? adminApi.put(`/shipping/districts/${district.id}`, values)
        : adminApi.post("/shipping/districts", values),
    onSuccess: () => {
      showSuccess(isEdit ? "District updated" : "District created");
      queryClient.invalidateQueries({ queryKey: ["admin", "shipping", "districts"] });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the district."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit District" : "Add District"}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="district-form" loading={save.isPending}>
            {isEdit ? "Save Changes" : "Create District"}
          </Button>
        </>
      }
    >
      <form id="district-form" onSubmit={handleSubmit((values) => save.mutate(values), onFormInvalid)} className="space-y-4">
        <FormField label="District Name" htmlFor="district-name" error={errors.name?.message} required>
          <Input id="district-name" placeholder="e.g. Dubai - Deira" {...register("name")} />
        </FormField>

        <p className="text-caption text-ink-muted">
          Once created, set its delivery fee on the Rates tab — a district with no rate yet just uses the
          standard flat shipping fee.
        </p>

        <FormField label="Status">
          <Switch
            label={watch("is_active") ? "Active — offered at checkout" : "Inactive — hidden from checkout"}
            checked={watch("is_active")}
            onChange={(e) => setValue("is_active", e.target.checked)}
          />
        </FormField>
      </form>
    </Drawer>
  );
}

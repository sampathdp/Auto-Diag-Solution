"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Select } from "@/components/admin/ui/Select";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import {
  PromoCodeFormSchema,
  PROMO_CODE_FORM_DEFAULTS,
  type PromoCodeFormValues,
} from "@/lib/admin/schemas/promoCodeSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import type { PaginatedResponse } from "@/types/api";
import type { PromoCode } from "@/types/promoCode";
import type { SalesRep } from "@/types/salesRep";

export function PromoCodeDrawerForm({
  open,
  onClose,
  promo,
}: {
  open: boolean;
  onClose: () => void;
  /** Present = editing; absent = creating. */
  promo?: PromoCode | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!promo;

  const repsQuery = useAdminQuery<PaginatedResponse<SalesRep>>(adminQueryKeys.salesReps.all, "/sales-representatives", {
    per_page: 1000,
  });
  const reps = repsQuery.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PromoCodeFormValues>({
    resolver: zodResolver(PromoCodeFormSchema),
    defaultValues: PROMO_CODE_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        promo
          ? {
              code: promo.code,
              description: promo.description ?? "",
              sales_rep_id: promo.sales_rep_id,
              discount_type: promo.discount_type,
              discount_value: promo.discount_value,
              commission_type: promo.commission_type,
              commission_value: promo.commission_value,
              commission_base: promo.commission_base,
              minimum_order_amount: promo.minimum_order_amount,
              maximum_discount_amount: promo.maximum_discount_amount ?? "",
              usage_limit: promo.usage_limit ?? "",
              start_date: promo.start_date ?? "",
              expiry_date: promo.expiry_date ?? "",
              status: promo.status,
            }
          : PROMO_CODE_FORM_DEFAULTS
      );
    }
  }, [open, promo, reset]);

  const save = useMutation({
    mutationFn: (values: PromoCodeFormValues) => {
      const payload = {
        ...values,
        maximum_discount_amount: values.maximum_discount_amount === "" ? null : values.maximum_discount_amount,
        usage_limit: values.usage_limit === "" ? null : values.usage_limit,
        start_date: values.start_date === "" ? null : values.start_date,
        expiry_date: values.expiry_date === "" ? null : values.expiry_date,
      };
      return isEdit && promo ? adminApi.put(`/promo-codes/${promo.id}`, payload) : adminApi.post("/promo-codes", payload);
    },
    onSuccess: () => {
      showSuccess(isEdit ? "Promo code updated" : "Promo code created");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.promoCodes.all });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the promo code."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Promo Code" : "Create Promo Code"}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="promo-code-form" loading={save.isPending}>
            {isEdit ? "Save Changes" : "Save Promo Code"}
          </Button>
        </>
      }
    >
      <form id="promo-code-form" onSubmit={handleSubmit((values) => save.mutate(values), onFormInvalid)} className="space-y-4">
        <FormField label="Code" htmlFor="promo-code" error={errors.code?.message} required>
          <Input id="promo-code" placeholder="KASUN10" {...register("code")} className="uppercase" />
        </FormField>

        <FormField label="Description" htmlFor="promo-description" error={errors.description?.message}>
          <Textarea id="promo-description" rows={2} {...register("description")} />
        </FormField>

        <FormField label="Assign Sales Representative" htmlFor="promo-sales-rep" error={errors.sales_rep_id?.message} required>
          <Select id="promo-sales-rep" {...register("sales_rep_id")}>
            <option value={0}>Select a representative…</option>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name} ({rep.email})
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Customer Discount Type" htmlFor="promo-discount-type" error={errors.discount_type?.message} required>
            <Select id="promo-discount-type" {...register("discount_type")}>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
            </Select>
          </FormField>
          <FormField label="Discount Value" htmlFor="promo-discount-value" error={errors.discount_value?.message} required>
            <Input id="promo-discount-value" type="number" step="0.01" min="0" {...register("discount_value")} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Rep Commission Type" htmlFor="promo-commission-type" error={errors.commission_type?.message} required>
            <Select id="promo-commission-type" {...register("commission_type")}>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
            </Select>
          </FormField>
          <FormField label="Commission Value" htmlFor="promo-commission-value" error={errors.commission_value?.message} required>
            <Input id="promo-commission-value" type="number" step="0.01" min="0" {...register("commission_value")} />
          </FormField>
        </div>

        <FormField
          label="Commission Calculation Base"
          htmlFor="promo-commission-base"
          error={errors.commission_base?.message}
          helperText="Which order amount the rep's commission is calculated from."
          required
        >
          <Select id="promo-commission-base" {...register("commission_base")}>
            <option value="original_subtotal">Original Subtotal (before discount)</option>
            <option value="discounted_subtotal">Discounted Subtotal (after discount)</option>
            <option value="final_total">Final Total (incl. shipping & VAT)</option>
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Minimum Order Amount" htmlFor="promo-min-order" error={errors.minimum_order_amount?.message}>
            <Input id="promo-min-order" type="number" step="0.01" min="0" {...register("minimum_order_amount")} />
          </FormField>
          <FormField
            label="Maximum Discount Amount"
            htmlFor="promo-max-discount"
            error={errors.maximum_discount_amount?.message}
            helperText="Leave blank for no cap."
          >
            <Input id="promo-max-discount" type="number" step="0.01" min="0" {...register("maximum_discount_amount")} />
          </FormField>
        </div>

        <FormField label="Usage Limit" htmlFor="promo-usage-limit" error={errors.usage_limit?.message} helperText="Leave blank for unlimited use.">
          <Input id="promo-usage-limit" type="number" min="1" step="1" {...register("usage_limit")} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" htmlFor="promo-start-date" error={errors.start_date?.message}>
            <Input id="promo-start-date" type="date" {...register("start_date")} />
          </FormField>
          <FormField label="Expiry Date" htmlFor="promo-expiry-date" error={errors.expiry_date?.message}>
            <Input id="promo-expiry-date" type="date" {...register("expiry_date")} />
          </FormField>
        </div>

        <FormField label="Status" htmlFor="promo-status" error={errors.status?.message} required>
          <Select id="promo-status" {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </form>
    </Drawer>
  );
}

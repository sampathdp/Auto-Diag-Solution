"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { SalesRepFormSchema, SALES_REP_FORM_DEFAULTS, type SalesRepFormValues } from "@/lib/admin/schemas/salesRepSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import type { SalesRep } from "@/types/salesRep";

export function SalesRepDrawerForm({
  open,
  onClose,
  rep,
}: {
  open: boolean;
  onClose: () => void;
  /** Present = editing; absent = creating. */
  rep?: SalesRep | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!rep;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalesRepFormValues>({
    resolver: zodResolver(SalesRepFormSchema),
    defaultValues: SALES_REP_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        rep
          ? {
              name: rep.name,
              phone: rep.phone ?? "",
              email: rep.email,
              address: rep.address ?? "",
              status: rep.status,
              commission_type: rep.commission_type,
              commission_value: rep.commission_value,
            }
          : SALES_REP_FORM_DEFAULTS
      );
    }
  }, [open, rep, reset]);

  const save = useMutation({
    mutationFn: (values: SalesRepFormValues) =>
      isEdit && rep ? adminApi.put(`/sales-representatives/${rep.id}`, values) : adminApi.post("/sales-representatives", values),
    onSuccess: () => {
      showSuccess(isEdit ? "Sales representative updated" : "Sales representative created");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.salesReps.all });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the sales representative."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Sales Representative" : "Add Sales Representative"}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="sales-rep-form" loading={save.isPending}>
            {isEdit ? "Save Changes" : "Create Representative"}
          </Button>
        </>
      }
    >
      <form id="sales-rep-form" onSubmit={handleSubmit((values) => save.mutate(values), onFormInvalid)} className="space-y-4">
        <FormField label="Name" htmlFor="rep-name" error={errors.name?.message} required>
          <Input id="rep-name" {...register("name")} />
        </FormField>

        <FormField label="Email" htmlFor="rep-email" error={errors.email?.message} required>
          <Input id="rep-email" type="email" {...register("email")} />
        </FormField>

        <FormField label="Phone" htmlFor="rep-phone" error={errors.phone?.message}>
          <Input id="rep-phone" {...register("phone")} />
        </FormField>

        <FormField label="Address" htmlFor="rep-address" error={errors.address?.message}>
          <Input id="rep-address" {...register("address")} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Commission Type" htmlFor="rep-commission-type" error={errors.commission_type?.message} required>
            <Select id="rep-commission-type" {...register("commission_type")}>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
            </Select>
          </FormField>

          <FormField label="Commission Value" htmlFor="rep-commission-value" error={errors.commission_value?.message} required>
            <Input id="rep-commission-value" type="number" step="0.01" min="0" {...register("commission_value")} />
          </FormField>
        </div>

        <FormField label="Status" htmlFor="rep-status" error={errors.status?.message} required>
          <Select id="rep-status" {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </form>
    </Drawer>
  );
}

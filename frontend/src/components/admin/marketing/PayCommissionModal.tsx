"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Select } from "@/components/admin/ui/Select";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import {
  CommissionPaymentFormSchema,
  COMMISSION_PAYMENT_FORM_DEFAULTS,
  type CommissionPaymentFormValues,
} from "@/lib/admin/schemas/commissionPaymentSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import { formatAED } from "@/lib/admin/utils";
import type { Commission } from "@/types/commission";

export function PayCommissionModal({
  open,
  onClose,
  commission,
}: {
  open: boolean;
  onClose: () => void;
  commission: Commission | null;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommissionPaymentFormValues>({
    resolver: zodResolver(CommissionPaymentFormSchema),
    defaultValues: COMMISSION_PAYMENT_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) reset(COMMISSION_PAYMENT_FORM_DEFAULTS);
  }, [open, reset]);

  const pay = useMutation({
    mutationFn: (values: CommissionPaymentFormValues) => {
      if (!commission) throw new Error("No commission selected");
      return adminApi.post(`/commissions/${commission.id}/pay`, values);
    },
    onSuccess: () => {
      showSuccess("Commission marked as paid");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.commissions.all });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.commissions.dashboard });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not record the payment."),
  });

  if (!commission) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pay Commission — ${formatAED(commission.commission_amount)}`}
      description={`${commission.sales_rep_name ?? "Representative"} · Order ${commission.order_number ?? ""}`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="pay-commission-form" loading={pay.isPending}>
            Mark as Paid
          </Button>
        </>
      }
    >
      <form id="pay-commission-form" onSubmit={handleSubmit((values) => pay.mutate(values), onFormInvalid)} className="space-y-4">
        <FormField label="Payment Method" htmlFor="pay-method" error={errors.payment_method?.message} required>
          <Select id="pay-method" {...register("payment_method")}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        <FormField label="Payment Date" htmlFor="pay-date" error={errors.payment_date?.message} required>
          <Input id="pay-date" type="date" {...register("payment_date")} />
        </FormField>

        <FormField label="Payment Reference" htmlFor="pay-reference" error={errors.payment_reference?.message}>
          <Input id="pay-reference" placeholder="Transaction ID, cheque #, …" {...register("payment_reference")} />
        </FormField>

        <FormField label="Notes" htmlFor="pay-notes" error={errors.notes?.message}>
          <Textarea id="pay-notes" rows={2} {...register("notes")} />
        </FormField>
      </form>
    </Modal>
  );
}

import { z } from "zod";

export const CommissionPaymentFormSchema = z.object({
  payment_method: z.enum(["bank_transfer", "cash", "other"]),
  payment_reference: z.string().nullable().optional(),
  payment_date: z.string().min(1, "Payment date is required."),
  notes: z.string().nullable().optional(),
});

export type CommissionPaymentFormValues = z.infer<typeof CommissionPaymentFormSchema>;

export const COMMISSION_PAYMENT_FORM_DEFAULTS: CommissionPaymentFormValues = {
  payment_method: "bank_transfer",
  payment_reference: "",
  payment_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

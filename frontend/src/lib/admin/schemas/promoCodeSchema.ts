import { z } from "zod";

export const PromoCodeFormSchema = z.object({
  code: z.string().min(1, "Code is required."),
  description: z.string().nullable().optional(),
  sales_rep_id: z.coerce.number({ invalid_type_error: "Assign a sales representative." }).int().positive("Assign a sales representative."),
  discount_type: z.enum(["percentage", "fixed_amount"]),
  discount_value: z.coerce.number({ invalid_type_error: "Enter a discount value." }).nonnegative("Discount value can't be negative."),
  commission_type: z.enum(["percentage", "fixed_amount"]),
  commission_value: z.coerce.number({ invalid_type_error: "Enter a commission value." }).nonnegative("Commission value can't be negative."),
  commission_base: z.enum(["original_subtotal", "discounted_subtotal", "final_total"]),
  minimum_order_amount: z.coerce.number().nonnegative("Minimum order amount can't be negative."),
  // Empty string clears the field back to "no cap"/"no limit" — coerced to null on submit.
  maximum_discount_amount: z.union([z.coerce.number().nonnegative("Can't be negative."), z.literal("")]).nullable().optional(),
  usage_limit: z.union([z.coerce.number().int().positive("Must be at least 1."), z.literal("")]).nullable().optional(),
  start_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
});

export type PromoCodeFormValues = z.infer<typeof PromoCodeFormSchema>;

export const PROMO_CODE_FORM_DEFAULTS: PromoCodeFormValues = {
  code: "",
  description: "",
  sales_rep_id: 0,
  discount_type: "percentage",
  discount_value: 0,
  commission_type: "percentage",
  commission_value: 0,
  commission_base: "discounted_subtotal",
  minimum_order_amount: 0,
  maximum_discount_amount: "",
  usage_limit: "",
  start_date: "",
  expiry_date: "",
  status: "active",
};

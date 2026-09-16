import { z } from "zod";

export const SalesRepFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  phone: z.string().nullable().optional(),
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  address: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
  commission_type: z.enum(["percentage", "fixed_amount"]),
  commission_value: z.coerce
    .number({ invalid_type_error: "Enter a commission value." })
    .nonnegative("Commission value can't be negative."),
});

export type SalesRepFormValues = z.infer<typeof SalesRepFormSchema>;

export const SALES_REP_FORM_DEFAULTS: SalesRepFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  status: "active",
  commission_type: "percentage",
  commission_value: 0,
};

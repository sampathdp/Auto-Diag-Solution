import { z } from "zod";

export const DistrictFormSchema = z.object({
  name: z.string().min(1, "District name is required."),
  is_active: z.boolean(),
});

export type DistrictFormValues = z.infer<typeof DistrictFormSchema>;

export const DISTRICT_FORM_DEFAULTS: DistrictFormValues = {
  name: "",
  is_active: true,
};

export const RateFormSchema = z.object({
  district_id: z.coerce.number({ invalid_type_error: "Select a district." }).int().positive("Select a district."),
  rate: z.coerce.number({ invalid_type_error: "Enter a rate." }).nonnegative("Rate can't be negative."),
  // Empty string clears the field back to "use the flat default" — coerced to null on submit.
  free_shipping_threshold: z
    .union([z.coerce.number().nonnegative("Threshold can't be negative."), z.literal("")])
    .nullable()
    .optional(),
});

export type RateFormValues = z.infer<typeof RateFormSchema>;

export const RATE_FORM_DEFAULTS: RateFormValues = {
  district_id: 0,
  rate: 0,
  free_shipping_threshold: "",
};

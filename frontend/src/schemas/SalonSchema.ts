import * as z from "zod";

export const SalonSchema = z.object({
  name: z.string().min(2, "Salon name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must be alphanumeric with hyphens"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(5, "Phone number is too short").optional().or(z.literal("")),
  address: z.string().optional(),
  timezone: z.string().default("Asia/Colombo"),
  currency: z.string().default("LKR"),
  owner_name: z.string().min(2, "Owner name must be at least 2 characters").optional(),
  is_active: z.boolean().default(true),
  grace_period_days: z.coerce.number().min(0, "Grace period cannot be negative").optional(),
});

export type SalonFormValues = z.infer<typeof SalonSchema>;

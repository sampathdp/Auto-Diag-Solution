import { z } from "zod";

export const ServiceSchema = z.object({
  name: z.string().min(2, "Service name must be at least 2 characters"),
  category_id: z.string().or(z.number()).optional(),
  duration_minutes: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof ServiceSchema>;

export const CategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
});

export type CategoryFormValues = z.infer<typeof CategorySchema>;

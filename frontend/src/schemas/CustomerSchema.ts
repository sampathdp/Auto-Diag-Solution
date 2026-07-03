import * as z from "zod";

export const CustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(5, "Phone number is too short"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  loyalty_points: z.number().default(0),
  notes: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof CustomerSchema>;

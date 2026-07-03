import { z } from "zod";

export const StaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  designation: z.string().min(2, "Designation is required"),
  salary: z.coerce.number().min(0, "Salary cannot be negative"),
  commission_enabled: z.boolean().default(true),
  commission_type: z.enum(["fixed", "percentage"]),
  commission_value: z.coerce.number().min(0, "Value cannot be negative"),
  is_active: z.boolean().default(true),
  branch_id: z.coerce.number().nullable().optional(),
});

export type StaffFormValues = z.infer<typeof StaffSchema>;

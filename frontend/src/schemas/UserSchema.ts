import * as z from "zod";

export const UserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "manager", "staff", "receptionist"]),
  is_active: z.boolean().default(true),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

export type UserFormValues = z.infer<typeof UserSchema>;

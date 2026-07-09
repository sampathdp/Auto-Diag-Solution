import { z } from "zod";

export const ProfileFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
});
export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z.string().min(8, "New password must be at least 8 characters."),
    confirm_password: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match.",
    path: ["confirm_password"],
  });
export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;

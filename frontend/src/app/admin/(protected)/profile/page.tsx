"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { FormField } from "@/components/admin/ui/FormField";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { useAdminMe } from "@/lib/admin/hooks/useAdminAuth";
import { AuthService } from "@/services/AuthService";
import { ChangePasswordSchema, type ChangePasswordValues } from "@/lib/admin/schemas/profileSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";

export default function AdminProfilePage() {
  const meQuery = useAdminMe();
  const user = meQuery.data?.user;

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(ChangePasswordSchema) });

  const changePassword = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      AuthService.changePassword(payload),
    onSuccess: () => {
      showSuccess("Password changed");
      resetPasswordForm();
    },
    onError: (err: any) => showError(err?.response?.data?.message || "Could not change password."),
  });

  if (meQuery.isLoading || !user) return <FullScreenLoader label="Loading profile…" />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" description="Your admin account details." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-h4 font-bold text-ink">Account</h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="h-7 w-7" />
              </span>
              <div>
                <p className="font-medium text-ink">{user.name}</p>
                <p className="text-caption text-ink-muted capitalize">{user.role}</p>
              </div>
            </div>

            <FormField label="Name" htmlFor="name" helperText="Contact an administrator to change your name.">
              <Input id="name" value={user.name} disabled />
            </FormField>
            <FormField label="Email" htmlFor="email" helperText="Read-only.">
              <Input id="email" value={user.email} disabled />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h4 font-bold text-ink">Change Password</h2>
          </CardHeader>
          <CardBody>
            <form
              id="password-form"
              onSubmit={handlePasswordSubmit((values) =>
                changePassword.mutate({
                  current_password: values.current_password,
                  new_password: values.new_password,
                }), onFormInvalid
              )}
              className="space-y-4"
            >
              <FormField
                label="Current Password"
                htmlFor="current_password"
                error={passwordErrors.current_password?.message}
                required
              >
                <Input id="current_password" type="password" {...registerPassword("current_password")} />
              </FormField>
              <FormField
                label="New Password"
                htmlFor="new_password"
                error={passwordErrors.new_password?.message}
                required
              >
                <Input id="new_password" type="password" {...registerPassword("new_password")} />
              </FormField>
              <FormField
                label="Confirm New Password"
                htmlFor="confirm_password"
                error={passwordErrors.confirm_password?.message}
                required
              >
                <Input id="confirm_password" type="password" {...registerPassword("confirm_password")} />
              </FormField>
            </form>
          </CardBody>
          <CardFooter>
            <Button type="submit" form="password-form" loading={changePassword.isPending}>
              Change Password
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

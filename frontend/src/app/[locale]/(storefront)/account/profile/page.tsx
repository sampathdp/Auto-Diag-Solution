"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";
import { Camera, ShieldCheck, Download, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+971(5[0-9]|2|3|4|6|7|9)[0-9]{7}$/, "Must be a valid UAE phone number starting with +971"),
  dob: z.string().optional(),
  language: z.enum(["en", "ar"]),
  currency: z.string(),
  marketingEmails: z.boolean(),
  whatsappUpdates: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Must be at least 8 characters").regex(/^(?=.*[A-Za-z])(?=.*\d).*$/, "Must contain at least one letter and one number"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Danger Zone
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "+971",
      dob: "",
      language: "en",
      currency: "AED",
      marketingEmails: false,
      whatsappUpdates: false,
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useUnsavedChangesGuard(profileForm.formState.isDirty || passwordForm.formState.isDirty);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/account/me");
        const data = res.data.data;
        const [firstName, ...lastNameParts] = (data.name || "").split(" ");
        profileForm.reset({
          firstName,
          lastName: lastNameParts.join(" "),
          email: data.email || "",
          phone: data.phone || "+971",
          dob: data.dob || "",
          language: data.language || "en",
          currency: "AED",
          marketingEmails: data.preferences?.marketing_emails || false,
          whatsappUpdates: data.preferences?.whatsapp_updates || false,
        });
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [profileForm, toast]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      await apiClient.patch("/account/me", {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        language: data.language,
        preferences: {
          marketing_emails: data.marketingEmails,
          whatsapp_updates: data.whatsappUpdates,
        },
      });
      profileForm.reset(data); // reset dirty state
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setSavingPassword(true);
    try {
      await apiClient.post("/account/me/change-password", {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      passwordForm.reset();
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      await apiClient.delete("/account/me");
      toast.success("Account deleted");
      logout();
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to delete account");
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div>
      <AccountPageHeader title="Profile" subtitle="Manage your personal information and password." />
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column - Forms */}
        <div className="flex-1 w-full space-y-8">
          
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
            {/* Identity Card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-6 pb-6 border-b">
                <div className="relative group cursor-pointer">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl overflow-hidden">
                    {profileForm.watch("firstName")?.charAt(0) || "U"}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Avatar & Identity</h3>
                  <p className="text-sm text-muted-foreground">Click the avatar to upload a new photo.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">First Name</label>
                  <input
                    {...profileForm.register("firstName")}
                    className={cn(
                      "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      profileForm.formState.errors.firstName && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {profileForm.formState.errors.firstName && <span className="text-xs text-destructive">{profileForm.formState.errors.firstName.message}</span>}
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Last Name</label>
                  <input
                    {...profileForm.register("lastName")}
                    className={cn(
                      "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      profileForm.formState.errors.lastName && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {profileForm.formState.errors.lastName && <span className="text-xs text-destructive">{profileForm.formState.errors.lastName.message}</span>}
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Email Address</label>
                    <span className="flex items-center text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                    </span>
                  </div>
                  <input
                    {...profileForm.register("email")}
                    className={cn(
                      "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      profileForm.formState.errors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {profileForm.formState.errors.email && <span className="text-xs text-destructive">{profileForm.formState.errors.email.message}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <input
                    {...profileForm.register("phone")}
                    placeholder="+971501234567"
                    className={cn(
                      "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      profileForm.formState.errors.phone && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {profileForm.formState.errors.phone && <span className="text-xs text-destructive">{profileForm.formState.errors.phone.message}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <input
                    type="date"
                    {...profileForm.register("dob")}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">Language Preference</label>
                  <select
                    {...profileForm.register("language")}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <option value="en">English (EN)</option>
                    <option value="ar">العربية (AR)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preferences Card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-6">
              <h3 className="text-lg font-semibold border-b pb-4">Preferences</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    disabled
                    {...profileForm.register("currency")}
                    className="flex h-10 w-full rounded-md border bg-muted text-muted-foreground px-3 py-2 text-sm opacity-70"
                  >
                    <option value="AED">AED - United Arab Emirates Dirham</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Currency is locked to AED for this region.</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="marketing"
                    {...profileForm.register("marketingEmails")}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="marketing" className="text-sm font-medium leading-none">
                    Receive marketing emails and exclusive offers
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="whatsapp"
                    {...profileForm.register("whatsappUpdates")}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="whatsapp" className="text-sm font-medium leading-none">
                    Receive order updates via WhatsApp
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={!profileForm.formState.isDirty || !profileForm.formState.isValid || savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save Profile Changes"}
                </Button>
              </div>
            </div>
          </form>

          {/* Change Password Card */}
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-semibold">Change Password</h3>
              <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
            </div>
            
            <div className="flex flex-col gap-4 max-w-md">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Current Password</label>
                <input
                  type="password"
                  {...passwordForm.register("currentPassword")}
                  className={cn(
                    "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    passwordForm.formState.errors.currentPassword && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {passwordForm.formState.errors.currentPassword && <span className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">New Password</label>
                <input
                  type="password"
                  {...passwordForm.register("newPassword")}
                  className={cn(
                    "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    passwordForm.formState.errors.newPassword && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {passwordForm.formState.errors.newPassword && <span className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</span>}
                {/* Basic strength meter placeholder */}
                {passwordForm.watch("newPassword").length > 0 && (
                  <div className="flex gap-1 mt-1">
                    <div className={cn("h-1 w-1/3 rounded-full", passwordForm.watch("newPassword").length > 5 ? "bg-primary" : "bg-destructive")} />
                    <div className={cn("h-1 w-1/3 rounded-full", passwordForm.watch("newPassword").length > 7 && /[A-Za-z]/.test(passwordForm.watch("newPassword")) && /\d/.test(passwordForm.watch("newPassword")) ? "bg-primary" : "bg-muted")} />
                    <div className={cn("h-1 w-1/3 rounded-full", passwordForm.watch("newPassword").length > 10 ? "bg-primary" : "bg-muted")} />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Confirm Password</label>
                <input
                  type="password"
                  {...passwordForm.register("confirmPassword")}
                  className={cn(
                    "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    passwordForm.formState.errors.confirmPassword && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {passwordForm.formState.errors.confirmPassword && <span className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</span>}
              </div>
            </div>

            <div className="flex justify-start">
              <Button 
                type="submit" 
                variant="secondary"
                disabled={!passwordForm.formState.isDirty || !passwordForm.formState.isValid || savingPassword}
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="rounded-xl border border-destructive/20 bg-card p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all associated data.</p>
            </div>
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
              Delete My Account
            </Button>
          </div>

        </div>

        {/* Right Column - Summary & Actions */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Account Summary</h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm font-medium">January 2024</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Orders</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Spent</span>
                <span className="text-sm font-medium">AED 4,250.00</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Status Tier</span>
                <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                  Gold Member
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="w-full justify-start gap-2">
                <Download className="h-4 w-4" />
                Download my data
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2 text-success hover:text-success hover:bg-success/10">
                <MessageCircle className="h-4 w-4" />
                Contact Support via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Account"
        description={<>
          Are you sure you want to delete your account? This action cannot be undone. All your order history and saved data will be lost. 
          <br /><br />
          Type <strong>DELETE</strong> below to confirm.
          <input
            type="text"
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder="DELETE"
          />
        </>}
        confirmLabel="Yes, delete my account"
        onConfirm={handleDeleteAccount}
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
}

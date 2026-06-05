"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminFormField, invalidInputClass } from "@/components/admin/admin-form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { getPasswordChecks, validateStrongPassword } from "@/lib/validation/validators";
import { cn } from "@/lib/utils";
import { Camera, Save } from "lucide-react";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminProfilePage() {
  const profile = useQuery(api.auth.getMyProfile);
  const updateProfile = useMutation(api.auth.updateMyProfile);
  const changePassword = useMutation(api.auth.changeMyPassword);
  const generateUploadUrl = useMutation(api.auth.generateProfileImageUploadUrl);
  const saveProfileImage = useMutation(api.auth.saveProfileImageFromStorage);

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordChecks = useMemo(() => getPasswordChecks(newPassword), [newPassword]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setImageUrl(profile.image ?? null);
  }, [profile?.email, profile?.image, profile?.name]);

  if (profile === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-[#6254f3]" />
      </div>
    );
  }

  const validateProfile = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toastError("Name must be at least 2 characters", {
        title: "Invalid name",
      });
      return false;
    }
    if (trimmed.length > 80) {
      toastError("Name must be 80 characters or fewer", {
        title: "Invalid name",
      });
      return false;
    }
    return true;
  };

  const validatePasswordForm = () => {
    if (!oldPassword) {
      toastError("Current password is required", { title: "Missing field" });
      return false;
    }
    const strong = validateStrongPassword(newPassword);
    if (strong) {
      toastError(strong, { title: "Weak password" });
      return false;
    }
    if (confirmPassword !== newPassword) {
      toastError("Confirm password must match new password", {
        title: "Passwords do not match",
      });
      return false;
    }
    return true;
  };

  const onSaveProfile = async () => {
    if (!validateProfile()) return;
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        image: imageUrl ?? null,
      });
      toastSuccess("Profile updated");
    } catch (error) {
      toastError(error, {
        title: "Couldn't update profile",
        fallback: "Failed to update your profile. Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const onUploadImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Please choose an image file", { title: "Invalid file" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("Image must be smaller than 5MB", { title: "File too large" });
      return;
    }
    setUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error("Image upload failed");
      }
      const data = (await response.json()) as { storageId?: string };
      if (!data.storageId) {
        throw new Error("Image upload failed");
      }
      const saved = await saveProfileImage({
        storageId: data.storageId as Id<"_storage">,
      });
      setImageUrl(saved.image);
      toastSuccess("Profile photo uploaded");
    } catch (error) {
      toastError(error, {
        title: "Couldn't upload photo",
        fallback: "Failed to upload profile photo. Please try again.",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const onChangePassword = async () => {
    if (!validatePasswordForm()) return;
    setSavingPassword(true);
    try {
      await changePassword({
        oldPassword,
        newPassword,
        revokeOtherSessions,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toastSuccess("Password changed successfully");
    } catch (error) {
      toastError(error, {
        title: "Couldn't change password",
        fallback: "Current password may be incorrect. Please try again.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Profile"
        description="Manage your account details and security settings."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile information</CardTitle>
            <CardDescription>
              Keep your public admin details accurate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="!size-32 shrink-0">
                <AvatarImage src={imageUrl ?? undefined} alt={name || profile.name} />
                <AvatarFallback>{getInitials(name || profile.name)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label
                  htmlFor="profile-image"
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted",
                    uploadingImage && "pointer-events-none opacity-60"
                  )}
                >
                  {uploadingImage ? (
                    <>
                      <Spinner className="size-4" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="size-3.5" />
                      Upload photo
                    </>
                  )}
                </Label>
                <input
                  id="profile-image"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => onUploadImage(e.target.files?.[0])}
                  disabled={uploadingImage}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP up to 5MB.
                </p>
              </div>
            </div>

            <AdminFormField label="Name" htmlFor="profile-name" required>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={invalidInputClass(name.trim().length > 0 && name.trim().length < 2 ? "error" : undefined)}
              />
            </AdminFormField>

            <AdminFormField
              label="Email"
              htmlFor="profile-email"
              description="Email is managed by authentication and cannot be edited here."
            >
              <Input id="profile-email" value={profile.email} disabled />
            </AdminFormField>

            <AdminFormField
              label="Email status"
              htmlFor="profile-email-status"
              description={
                profile.emailVerified
                  ? "Your email address has been verified."
                  : "Verify your email on next sign-in to complete account setup."
              }
            >
              <Input
                id="profile-email-status"
                value={profile.emailVerified ? "Verified" : "Unverified"}
                disabled
                className={cn(
                  profile.emailVerified
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                )}
              />
            </AdminFormField>

            <Button
              onClick={onSaveProfile}
              disabled={savingProfile || uploadingImage}
              className="h-10 bg-[#6254f3] hover:bg-[#5548e0]"
            >
              {savingProfile ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Change your password and session settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminFormField label="Current password" htmlFor="old-password" required>
              <Input
                id="old-password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </AdminFormField>

            <AdminFormField
              label="New password"
              htmlFor="new-password"
              required
              description="At least 8 characters with upper, lower, number, and symbol."
            >
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {newPassword.length > 0 ? (
                <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <PasswordHint ok={passwordChecks.minLength} label="8+ characters" />
                  <PasswordHint ok={passwordChecks.uppercase} label="Uppercase" />
                  <PasswordHint ok={passwordChecks.lowercase} label="Lowercase" />
                  <PasswordHint ok={passwordChecks.number} label="Number" />
                  <PasswordHint ok={passwordChecks.special} label="Special char" />
                </ul>
              ) : null}
            </AdminFormField>

            <AdminFormField label="Confirm password" htmlFor="confirm-password" required>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </AdminFormField>

            <Separator />

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Sign out other devices</p>
                <p className="text-xs text-muted-foreground">
                  Revoke all other sessions after changing password.
                </p>
              </div>
              <Switch
                checked={revokeOtherSessions}
                onCheckedChange={setRevokeOtherSessions}
              />
            </div>

            <Button
              onClick={onChangePassword}
              disabled={savingPassword}
              className="h-10 bg-[#6254f3] hover:bg-[#5548e0]"
            >
              {savingPassword ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Updating...
                </>
              ) : (
                "Change password"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PasswordHint({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2", ok && "text-emerald-600")}>
      <span
        className={cn(
          "size-1.5 rounded-full bg-muted-foreground/40",
          ok && "bg-emerald-500"
        )}
      />
      {label}
    </li>
  );
}

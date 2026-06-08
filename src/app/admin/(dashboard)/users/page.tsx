"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AdminFormField, invalidInputClass } from "@/components/admin/admin-form-field";
import { PasswordField } from "@/components/admin/password-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, toastSuccess } from "@/lib/app-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFormValidation } from "@/hooks/use-form-validation";
import { validateCreateUserForm } from "@/lib/validation/admin-forms";
import { cn } from "@/lib/utils";
import { Ban, Trash2, UserPlus } from "lucide-react";

type AuthUserRow = {
  _id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role?: string | null;
  banned?: boolean | null;
};

export default function AdminUsersPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.adminUsers.listPaginated,
    {},
    { initialNumItems: 20 }
  );
  const createUser = useMutation(api.adminUsers.createUser);
  const setRole = useMutation(api.adminUsers.setRole);
  const banUser = useMutation(api.adminUsers.banUser);
  const unbanUser = useMutation(api.adminUsers.unbanUser);
  const removeUser = useMutation(api.adminUsers.removeUser);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin" as "user" | "admin" | "superAdmin",
  });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validateUser = useCallback(
    (values: typeof form) => validateCreateUserForm(values),
    []
  );
  const validation = useFormValidation(form, validateUser);

  const resetValidation = validation.reset;
  useEffect(() => {
    if (!dialogOpen) resetValidation();
  }, [dialogOpen, resetValidation]);

  const users = results as AuthUserRow[];

  const handleCreate = async () => {
    if (!validation.validateAll()) return;
    setSaving(true);
    try {
      await createUser(form);
      toastSuccess("User created");
      setDialogOpen(false);
      setForm({ email: "", password: "", name: "", role: "admin" });
    } catch (e) {
      toastError(e, {
        title: "Couldn't create user",
        fallback: "Failed to create user. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    if (isCurrentUser(deleteUserId)) {
      toastError(null, {
        title: "Action not allowed",
        fallback: "You can't delete your own account.",
      });
      setDeleteUserId(null);
      return;
    }
    setSaving(true);
    try {
      await removeUser({ userId: deleteUserId });
      toastSuccess("User removed");
      setDeleteUserId(null);
    } catch (e) {
      toastError(e, {
        title: "Couldn't remove user",
        fallback: "Failed to remove user. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const isCurrentUser = (userId: string) =>
    currentUserId !== null && currentUserId === userId;

  const toggleBan = async (user: AuthUserRow) => {
    if (isCurrentUser(user._id)) return;
    setSaving(true);
    try {
      if (user.banned) {
        await unbanUser({ userId: user._id });
        toastSuccess("User unbanned");
      } else {
        await banUser({ userId: user._id });
        toastSuccess("User banned");
      }
    } catch (e) {
      toastError(e, {
        title: "Couldn't update ban",
        fallback: "Failed to update ban status. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (userId: string, role: "user" | "admin" | "superAdmin") => {
    setSaving(true);
    try {
      await setRole({ userId, role });
      toastSuccess("Role updated");
    } catch (e) {
      toastError(e, {
        title: "Couldn't update role",
        fallback: "Failed to update role. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Manage admin and staff accounts."
      />

      <AdminListToolbar
        hideTabs
        showSearch={false}
        search=""
        onSearchChange={() => {}}
        actionLabel="Add user"
        onAction={() => setDialogOpen(true)}
      />

      <AdminTableCard>
        <Table className="min-w-[40rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isSelf = isCurrentUser(user._id);
                return (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role ?? "user"}
                      onValueChange={(v) =>
                        changeRole(
                          user._id,
                          (v ?? "user") as "user" | "admin" | "superAdmin"
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-full max-w-[8.5rem] sm:max-w-[9rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superAdmin">Super admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={user.emailVerified ? "default" : "secondary"}>
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </Badge>
                      {user.banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleBan(user)}
                                disabled={saving || isSelf}
                              aria-label={
                                isSelf ? "Cannot ban your own account" : "Ban user"
                              }
                              >
                                <Ban className="size-4" />
                              </Button>
                            </span>
                          }
                        />
                        {isSelf ? (
                          <TooltipContent>You can&apos;t ban your own account</TooltipContent>
                        ) : null}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteUserId(user._id)}
                                disabled={isSelf}
                              aria-label={
                                isSelf
                                  ? "Cannot delete your own account"
                                  : "Delete user"
                              }
                            >
                              <Trash2
                                className={
                                  isSelf
                                    ? "size-4 text-muted-foreground/40"
                                    : "size-4 text-destructive"
                                }
                              />
                              </Button>
                            </span>
                          }
                        />
                        {isSelf ? (
                          <TooltipContent>
                            You can&apos;t delete your own account
                          </TooltipContent>
                        ) : null}
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </AdminTableCard>

      {status === "CanLoadMore" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>
            Load more
          </Button>
        </div>
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setForm({ email: "", password: "", name: "", role: "admin" });
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              New user
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <AdminFormField
              label="Full name"
              htmlFor="user-name"
              error={validation.fieldError("name")}
              required
            >
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                onBlur={() => validation.touch("name")}
                aria-invalid={!!validation.fieldError("name")}
                className={invalidInputClass(validation.fieldError("name"))}
              />
            </AdminFormField>
            <AdminFormField
              label="Email"
              htmlFor="user-email"
              error={validation.fieldError("email")}
              description="Work email for sign-in and notifications"
              required
            >
              <Input
                id="user-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                onBlur={() => validation.touch("email")}
                aria-invalid={!!validation.fieldError("email")}
                className={invalidInputClass(validation.fieldError("email"))}
              />
            </AdminFormField>
            <PasswordField
              id="user-password"
              value={form.password}
              onChange={(password) => setForm((f) => ({ ...f, password }))}
              onBlur={() => validation.touch("password")}
              error={validation.fieldError("password")}
            />
            <AdminFormField
              label="Role"
              error={validation.fieldError("role")}
              required
            >
              <Select
                value={form.role}
                onValueChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    role: (v ?? "admin") as typeof f.role,
                  }));
                  validation.touch("role");
                }}
              >
                <SelectTrigger
                  className={cn(
                    invalidInputClass(validation.fieldError("role"))
                  )}
                  aria-invalid={!!validation.fieldError("role")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superAdmin">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteUserId}
        onOpenChange={(o) => !o && setDeleteUserId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Remove user?"
        description="This permanently deletes the user account."
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin" as "user" | "admin" | "superAdmin",
  });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const users = results as AuthUserRow[];

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.name) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await createUser(form);
      toast.success("User created");
      setDialogOpen(false);
      setForm({ email: "", password: "", name: "", role: "admin" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    setSaving(true);
    try {
      await removeUser({ userId: deleteUserId });
      toast.success("User removed");
      setDeleteUserId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleBan = async (user: AuthUserRow) => {
    setSaving(true);
    try {
      if (user.banned) {
        await unbanUser({ userId: user._id });
        toast.success("User unbanned");
      } else {
        await banUser({ userId: user._id });
        toast.success("User banned");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (userId: string, role: "user" | "admin" | "superAdmin") => {
    setSaving(true);
    try {
      await setRole({ userId, role });
      toast.success("Role updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Manage admin and staff accounts."
        actionLabel="Add user"
        onAction={() => setDialogOpen(true)}
      />

      <div className="rounded-lg border bg-background">
        <Table>
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
              users.map((user) => (
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
                      <SelectTrigger className="h-8 w-[130px]">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleBan(user)}
                        disabled={saving}
                      >
                        <Ban className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteUserId(user._id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {status === "CanLoadMore" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>
            Load more
          </Button>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              New user
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    role: (v ?? "admin") as typeof f.role,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superAdmin">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create user"}
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

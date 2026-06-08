"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { AdminFormField, invalidInputClass } from "@/components/admin/admin-form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormValidation } from "@/hooks/use-form-validation";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { validateSettingForm } from "@/lib/validation/settings-form";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

type SettingRow = Doc<"settings">;

const emptyForm = {
  name: "",
  value: "",
};

async function syncResendFromToConvex(value: string) {
  const response = await fetch("/api/admin/sync-resend-from", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to sync Email From to Convex");
  }
}

export default function AdminSettingsPage() {
  const settings = useQuery(api.settings.list);
  const ensureDefaults = useMutation(api.settings.ensureDefaults);
  const create = useMutation(api.settings.create);
  const update = useMutation(api.settings.update);
  const remove = useMutation(api.settings.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SettingRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<Id<"settings"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [defaultsReady, setDefaultsReady] = useState(false);
  const [envSyncAttempted, setEnvSyncAttempted] = useState(false);

  const takenNames = useQuery(
    api.settings.listTakenNames,
    dialogOpen ? (editing ? { excludeId: editing._id } : {}) : "skip"
  );
  const takenKeys = useQuery(
    api.settings.listTakenKeys,
    dialogOpen ? (editing ? { excludeId: editing._id } : {}) : "skip"
  );

  const validate = useCallback(
    (values: typeof form) =>
      validateSettingForm(values, {
        takenNames: takenNames ?? [],
        takenKeys: takenKeys ?? [],
        settingKey: editing?.key,
        isSystem: editing?.isSystem,
      }),
    [takenNames, takenKeys, editing?.key, editing?.isSystem]
  );
  const validation = useFormValidation(form, validate);
  const resetValidation = validation.reset;

  useEffect(() => {
    if (defaultsReady) return;
    void ensureDefaults({})
      .then(() => setDefaultsReady(true))
      .catch(() => setDefaultsReady(true));
  }, [defaultsReady, ensureDefaults]);

  useEffect(() => {
    if (!dialogOpen) resetValidation();
  }, [dialogOpen, resetValidation]);

  useEffect(() => {
    if (!defaultsReady || envSyncAttempted || !settings) return;
    const emailFrom = settings.find((setting) => setting.key === "email_from");
    if (!emailFrom?.value.trim()) return;

    setEnvSyncAttempted(true);
    void syncResendFromToConvex(emailFrom.value).catch((error) => {
      console.warn("[settings] Email From env sync skipped:", error);
    });
  }, [defaultsReady, envSyncAttempted, settings]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    resetValidation();
    setDialogOpen(true);
  };

  const openEdit = (setting: SettingRow) => {
    setEditing(setting);
    setForm({ name: setting.name, value: setting.value });
    resetValidation();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!validation.validateAll()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        value: form.value.trim(),
      };
      if (editing) {
        await update({ id: editing._id, ...payload });
        if (editing.key === "email_from") {
          await syncResendFromToConvex(payload.value);
          toastSuccess("Email from updated and synced to Convex");
        } else {
          toastSuccess("Setting updated");
        }
      } else {
        await create(payload);
        toastSuccess("Setting created");
      }
      setDialogOpen(false);
    } catch (error) {
      toastError(error, {
        title: "Couldn't save setting",
        fallback: "Failed to save setting. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await remove({ id: deleteId });
      toastSuccess("Setting deleted");
      setDeleteId(null);
    } catch (error) {
      toastError(error, {
        title: "Couldn't delete setting",
        fallback: "Failed to delete setting. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const rows = settings ?? [];
  const isLoading = settings === undefined;

  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Manage store contact details and custom site settings."
      />

      <AdminListToolbar
        hideTabs
        showSearch={false}
        search=""
        onSearchChange={() => {}}
        actionLabel="Add setting"
        onAction={openCreate}
      />

      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table className="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Setting name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No settings yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((setting) => (
                  <TableRow key={setting._id}>
                    <TableCell className="font-medium">{setting.name}</TableCell>
                    <TableCell className="max-w-[24rem] truncate text-muted-foreground">
                      {setting.value}
                    </TableCell>
                    <TableCell>
                      {setting.isSystem ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit setting"
                          onClick={() => openEdit(setting)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete setting"
                          disabled={setting.isSystem}
                          onClick={() => setDeleteId(setting._id)}
                        >
                          <Trash2
                            className={cn(
                              "size-4",
                              setting.isSystem
                                ? "text-muted-foreground/40"
                                : "text-destructive"
                            )}
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AdminTableCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit setting" : "New setting"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <AdminFormField
              label="Setting name"
              htmlFor="setting-name"
              error={validation.fieldError("name")}
              required
            >
              <Input
                id="setting-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                onBlur={() => validation.touch("name")}
                aria-invalid={!!validation.fieldError("name")}
                className={invalidInputClass(validation.fieldError("name"))}
              />
            </AdminFormField>
            <AdminFormField
              label="Setting value"
              htmlFor="setting-value"
              error={validation.fieldError("value")}
              description={
                editing?.key === "email_from"
                  ? 'Saved to Convex as RESEND_FROM_EMAIL. Example: Ecommerce Store <you@yourdomain.com>'
                  : undefined
              }
              required
            >
              <Textarea
                id="setting-value"
                rows={4}
                value={form.value}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    value: event.target.value,
                  }))
                }
                onBlur={() => validation.touch("value")}
                aria-invalid={!!validation.fieldError("value")}
                className={invalidInputClass(validation.fieldError("value"))}
              />
            </AdminFormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                (dialogOpen && (takenNames === undefined || takenKeys === undefined))
              }
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete setting?"
        description="This custom setting will be permanently removed."
      />
    </>
  );
}

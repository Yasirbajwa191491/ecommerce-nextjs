"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { EmailRichTextEditor } from "@/components/admin/email-marketing/email-rich-text-editor";
import { EMPTY_TIPTAP_DOC } from "@/lib/email-marketing/tiptap-html";
import {
  DEFAULT_PRIVACY_TIPTAP,
  DEFAULT_TERMS_TIPTAP,
  isRichTextSettingKey,
  settingValuePreview,
} from "@/lib/legal-content";
import { cn } from "@/lib/utils";
import {
  ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY,
  PYTHON_ML_RECOMMENDATION_MODE_KEY,
  PYTHON_ML_REQUEST_TIMEOUT_MS_KEY,
  PYTHON_ML_TIMEOUT_MAX_MS,
  PYTHON_ML_TIMEOUT_MIN_MS,
} from "@convex/lib/recommendations/pythonMlConfig";
import { Pencil, Trash2 } from "lucide-react";

type SettingRow = Doc<"settings">;

const emptyForm = {
  name: "",
  value: "",
};

function settingMatchesSearch(setting: SettingRow, term: string) {
  const valueText = isRichTextSettingKey(setting.key)
    ? settingValuePreview(setting.value)
    : setting.value;
  const haystack = [
    setting.name,
    setting.key,
    setting.key.replaceAll("_", " "),
    valueText,
    setting.isSystem ? "system" : "custom",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

function normalizeRichTextValue(key: string, value: string) {
  if (!isRichTextSettingKey(key)) return value;

  try {
    const parsed = JSON.parse(value) as { type?: string };
    if (parsed.type === "doc") return value;
  } catch {
    // Fall through to defaults or plain-text conversion.
  }

  if (value.trim()) {
    return JSON.stringify({
      type: "doc",
      content: value
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((text) => ({
          type: "paragraph",
          content: [{ type: "text", text }],
        })),
    });
  }

  if (key === "terms_conditions") return DEFAULT_TERMS_TIPTAP;
  if (key === "privacy_policy") return DEFAULT_PRIVACY_TIPTAP;
  return EMPTY_TIPTAP_DOC;
}

function isBooleanSettingKey(key: string | undefined) {
  return (
    key === "sms_order_confirmation_enabled" ||
    key === "review_call_auto_enabled" ||
    key === ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY
  );
}

function settingValueLabel(key: string | undefined, richText: boolean) {
  if (key === "sms_order_confirmation_enabled") return "Send order SMS via Twilio";
  if (key === "review_call_auto_enabled") return "Automatic review collection calls";
  if (key === "review_call_auto_delay_days") return "Days after delivery before auto call";
  if (key === ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY) return "Enable Python ML Recommendations";
  if (key === PYTHON_ML_RECOMMENDATION_MODE_KEY) return "Python ML Recommendation Mode";
  if (key === PYTHON_ML_REQUEST_TIMEOUT_MS_KEY) return "Python ML Request Timeout (ms)";
  if (richText) return "Page content";
  return "Setting value";
}

function settingValueDescription(key: string | undefined) {
  if (key === "email_from") {
    return "Saved to Convex as RESEND_FROM_EMAIL. Example: Ecommerce Store <you@yourdomain.com>";
  }
  if (key === "shipping_policy" || key === "return_policy") {
    return "Used by the AI assistant and storefront FAQ. Plain text or markdown.";
  }
  if (key === "terms_conditions") {
    return "Displayed on the Terms & Conditions page. Use headings, lists, and links as needed.";
  }
  if (key === "privacy_policy") {
    return "Displayed on the Privacy Policy page. Use headings, lists, and links as needed.";
  }
  if (key === "sms_order_confirmation_enabled") {
    return "Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Convex env. When enabled, customers get SMS for confirmation, confirmed, processing, shipped, delivered, cancelled, and refunded updates on web and mobile (COD and Stripe). Off by default.";
  }
  if (key === "review_call_auto_enabled") {
    return "When enabled, an AI review call is scheduled automatically after an order is marked delivered. Requires Vapi outbound setup.";
  }
  if (key === "review_call_auto_delay_days") {
    return "Must be 3, 5, or 7 days. Used when automatic review calls are enabled.";
  }
  if (key === "cancellation_refund_fee_percent") {
    return "Percent deducted from the order total when a paid order is cancelled or refunded (0–100). Shown on admin and shop cancel/refund screens, terms, return policy, and order emails. Card refunds return the remainder to the original Stripe payment. COD refunds stay manual.";
  }
  if (key === ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY) {
    return "Off by default. When this is off, Python ML mode is treated as off even if a mode is saved. The service URL and API key are not stored in settings.";
  }
  if (key === PYTHON_ML_RECOMMENDATION_MODE_KEY) {
    return "Off skips Python ML. Shadow can run a comparison without changing what customers see. Serve does not change customer recommendations unless PYTHON_ML_SERVE_ENABLED is true on the deployment.";
  }
  if (key === PYTHON_ML_REQUEST_TIMEOUT_MS_KEY) {
    return `Whole number of milliseconds from ${PYTHON_ML_TIMEOUT_MIN_MS} to ${PYTHON_ML_TIMEOUT_MAX_MS}. The default is 1500.`;
  }
  return undefined;
}

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
  const [searchInput, setSearchInput] = useState("");

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

    const timer = window.setTimeout(() => {
      setEnvSyncAttempted(true);
      void syncResendFromToConvex(emailFrom.value).catch((error) => {
        console.warn("[settings] Email From env sync skipped:", error);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [defaultsReady, envSyncAttempted, settings]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    resetValidation();
    setDialogOpen(true);
  };

  const openEdit = (setting: SettingRow) => {
    setEditing(setting);
    setForm({
      name: setting.name,
      value: normalizeRichTextValue(setting.key, setting.value),
    });
    resetValidation();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!validation.validateAll()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        value: editingRichText ? form.value : form.value.trim(),
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

  const searchTerm = searchInput.trim().toLowerCase();
  const rows = useMemo(() => {
    const all = settings ?? [];
    if (!searchTerm) return all;
    return all.filter((setting) => settingMatchesSearch(setting, searchTerm));
  }, [settings, searchTerm]);
  const isLoading = settings === undefined;
  const editingRichText = isRichTextSettingKey(editing?.key);

  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Manage store contact details, recommendation controls, and custom site settings."
      />

      <AdminListToolbar
        hideTabs
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search settings"
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
                    {searchTerm
                      ? "No settings match your search"
                      : "No settings yet"}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((setting) => (
                  <TableRow key={setting._id}>
                    <TableCell className="font-medium">{setting.name}</TableCell>
                    <TableCell className="max-w-[24rem] truncate text-muted-foreground">
                      {isRichTextSettingKey(setting.key)
                        ? settingValuePreview(setting.value)
                        : setting.value}
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
        <DialogContent
          className={cn(
            "w-[calc(100vw-1.5rem)] max-w-md sm:max-w-lg",
            editingRichText &&
              "flex max-h-[min(92dvh,52rem)] flex-col overflow-hidden sm:max-w-3xl"
          )}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editing ? "Edit setting" : "New setting"}
            </DialogTitle>
          </DialogHeader>
          <div
            className={cn(
              "grid gap-4 py-2",
              editingRichText && "min-h-0 flex-1 overflow-y-auto"
            )}
          >
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
              label={settingValueLabel(editing?.key, editingRichText)}
              htmlFor="setting-value"
              error={validation.fieldError("value")}
              description={settingValueDescription(editing?.key)}
              required={!isBooleanSettingKey(editing?.key)}
            >
              {editing?.key === "sms_order_confirmation_enabled" ||
              editing?.key === "review_call_auto_enabled" ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <Switch
                    id="setting-value"
                    checked={form.value.trim().toLowerCase() === "true"}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        value: checked ? "true" : "false",
                      }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {editing?.key === "sms_order_confirmation_enabled"
                      ? form.value.trim().toLowerCase() === "true"
                        ? "Enabled — customers receive SMS for confirmation and order status updates"
                        : "Disabled — email only"
                      : form.value.trim().toLowerCase() === "true"
                        ? "Enabled — review calls scheduled after delivery"
                        : "Disabled — manual calls only from Orders"}
                  </span>
                </div>
              ) : editing?.key === "review_call_auto_delay_days" ? (
                <Select
                  value={form.value.trim() || "5"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      value: value ?? "5",
                    }))
                  }
                >
                  <SelectTrigger id="setting-value" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                  </SelectContent>
                </Select>
              ) : editing?.key === ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <Switch
                    id="setting-value"
                    checked={form.value.trim().toLowerCase() === "true"}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        value: checked ? "true" : "false",
                      }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.value.trim().toLowerCase() === "true"
                      ? "Enabled — Python ML can run only in shadow or serve mode"
                      : "Disabled — Python ML stays off"}
                  </span>
                </div>
              ) : editing?.key === PYTHON_ML_RECOMMENDATION_MODE_KEY ? (
                <Select
                  value={
                    form.value.trim().toLowerCase() === "shadow" ||
                    form.value.trim().toLowerCase() === "serve"
                      ? form.value.trim().toLowerCase()
                      : "off"
                  }
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      value: value ?? "off",
                    }))
                  }
                >
                  <SelectTrigger id="setting-value" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="shadow">Shadow</SelectItem>
                    <SelectItem value="serve">Serve</SelectItem>
                  </SelectContent>
                </Select>
              ) : editing?.key === PYTHON_ML_REQUEST_TIMEOUT_MS_KEY ? (
                <Input
                  id="setting-value"
                  type="number"
                  min={PYTHON_ML_TIMEOUT_MIN_MS}
                  max={PYTHON_ML_TIMEOUT_MAX_MS}
                  step={1}
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
              ) : editingRichText ? (
                <EmailRichTextEditor
                  contentJson={form.value || EMPTY_TIPTAP_DOC}
                  onChange={(contentJson) =>
                    setForm((current) => ({
                      ...current,
                      value: contentJson,
                    }))
                  }
                  placeholder={
                    editing?.key === "terms_conditions"
                      ? "Write your terms and conditions..."
                      : "Write your privacy policy..."
                  }
                  contentClassName="max-h-[min(52vh,28rem)]"
                />
              ) : (
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
              )}
            </AdminFormField>
          </div>
          <DialogFooter className={cn(editingRichText && "shrink-0")}>
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

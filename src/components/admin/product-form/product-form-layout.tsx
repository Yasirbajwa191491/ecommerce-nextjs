"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AdminBreadcrumb, type AdminBreadcrumbItem } from "@/components/admin/admin-breadcrumb";
import { AdminStickyFooter } from "@/components/admin/admin-sticky-footer";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProductFormLayoutProps = {
  title: string;
  description?: string;
  breadcrumbItems: AdminBreadcrumbItem[];
  children: ReactNode;
  sidebar?: ReactNode;
  saving?: boolean;
  saveLabel?: string;
  onSave: () => void;
  onSaveAndContinue?: () => void;
  onCancel: () => void;
  onBack: () => void;
  discardOpen: boolean;
  onDiscardConfirm: () => void;
  onDiscardCancel: () => void;
};

export function ProductFormLayout({
  title,
  description,
  breadcrumbItems,
  children,
  sidebar,
  saving = false,
  saveLabel = "Save product",
  onSave,
  onSaveAndContinue,
  onCancel,
  onBack,
  discardOpen,
  onDiscardConfirm,
  onDiscardCancel,
}: ProductFormLayoutProps) {
  return (
    <div className="pb-24">
      <div className="mb-4 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back to Products
        </Button>
        <AdminBreadcrumb items={breadcrumbItems} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">{children}</div>
        {sidebar ? (
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">{sidebar}</aside>
        ) : null}
      </div>

      <AdminStickyFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        {onSaveAndContinue ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveAndContinue}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save & continue editing"}
          </Button>
        ) : null}
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : saveLabel}
        </Button>
      </AdminStickyFooter>

      <AlertDialog open={discardOpen} onOpenChange={(open) => !open && onDiscardCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this product. If you leave now, your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onDiscardCancel}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onDiscardConfirm}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

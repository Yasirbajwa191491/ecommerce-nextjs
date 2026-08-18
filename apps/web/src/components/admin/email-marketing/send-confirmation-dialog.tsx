"use client";

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

type SendConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  subject: string;
  recipientCount: number;
  productCount: number;
  onConfirm: () => void;
  loading?: boolean;
};

export function SendConfirmationDialog({
  open,
  onOpenChange,
  campaignName,
  subject,
  recipientCount,
  productCount,
  onConfirm,
  loading,
}: SendConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send campaign?</AlertDialogTitle>
          <AlertDialogDescription>
            Please confirm you want to send &quot;{campaignName}&quot; ({subject}) to{" "}
            {recipientCount} recipients with {productCount} attached product
            {productCount === 1 ? "" : "s"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? "Sending..." : "Confirm & Send"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { Button } from "@/components/ui/button";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminPageHeader({
  title,
  description,
  actionLabel,
  onAction,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="shrink-0">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

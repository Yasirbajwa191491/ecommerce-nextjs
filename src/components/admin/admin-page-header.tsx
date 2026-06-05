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
    <div className="mb-6 sm:mb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="hidden text-xl font-semibold tracking-tight text-foreground lg:block sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground lg:mt-1">
              {description}
            </p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <Button size="sm" onClick={onAction} className="shrink-0">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

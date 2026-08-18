import { cn } from "@/lib/utils"

type SkeletonProps = React.ComponentProps<"div"> & {
  shimmer?: boolean;
};

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted",
        shimmer && "motion-skeleton-shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

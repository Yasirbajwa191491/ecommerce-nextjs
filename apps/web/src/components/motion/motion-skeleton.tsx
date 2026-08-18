import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MotionSkeletonProps = React.ComponentProps<typeof Skeleton> & {
  shimmer?: boolean;
};

export function MotionSkeleton({
  className,
  shimmer = true,
  ...props
}: MotionSkeletonProps) {
  return (
    <Skeleton
      className={cn(shimmer && "motion-skeleton-shimmer", className)}
      {...props}
    />
  );
}

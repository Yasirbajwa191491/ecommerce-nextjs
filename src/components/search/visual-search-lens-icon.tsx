import { cn } from "@/lib/utils";

type VisualSearchLensIconProps = {
  className?: string;
};

/** Google Search “Search by image” glyph — colored viewfinder corners + lens ring. */
export function VisualSearchLensIcon({ className }: VisualSearchLensIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-6 shrink-0 sm:size-[1.75rem]", className)}
      aria-hidden
    >
      <path fill="#EA4335" d="M3.75 3.75h6v2.5H6.25v2.5h-2.5v-5Z" />
      <path fill="#FBBC04" d="M14.25 3.75H20.25v5h-2.5V6.25h-2.5v-2.5Z" />
      <path fill="#34A853" d="M3.75 15.25v5h6v-2.5H6.25v-2.5h-2.5Z" />
      <path fill="#4285F4" d="M20.25 15.25v5h-6v-2.5h2.5v-2.5h3.5Z" />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="#5F6368"
        strokeWidth="2"
      />
    </svg>
  );
}

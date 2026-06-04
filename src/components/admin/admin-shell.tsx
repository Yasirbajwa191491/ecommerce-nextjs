"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { AdminAccessGate } from "@/components/admin/admin-access-gate";

const NAV = [
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/product-categories", label: "Categories", icon: FolderTree },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <LayoutDashboard className="size-5 text-primary" />
          <span className="font-semibold text-foreground">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <AdminAccessGate>{children}</AdminAccessGate>
        </div>
      </main>
    </div>
  );
}

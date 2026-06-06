"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  UserCircle2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { AdminAccessGate } from "@/components/admin/admin-access-gate";

const NAV = [
  { href: "/admin/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/product-categories", label: "Categories", icon: FolderTree },
  { href: "/admin/contact-messages", label: "Contact", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/profile", label: "Profile", icon: UserCircle2 },
];

function AdminNavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
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
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setMobileNavOpen(false);
    await authClient.signOut();
    router.push("/admin/login");
  };

  const currentPage =
    NAV.find((item) => item.href === pathname)?.label ?? "Admin";

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30 lg:flex-row">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent
            side="left"
            className="flex h-full w-[min(18rem,88vw)] flex-col gap-0 p-0"
          >
            <SheetHeader className="border-b px-4 py-4 text-left">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Link
                  href="/admin/home"
                  className="flex items-center gap-2"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <LayoutDashboard className="size-5 text-primary" />
                  Admin
                </Link>
              </SheetTitle>
            </SheetHeader>
            <AdminNavLinks
              pathname={pathname}
              onNavigate={() => setMobileNavOpen(false)}
            />
            <div className="mt-auto border-t p-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {currentPage}
          </p>
          <p className="truncate text-xs text-muted-foreground">Admin dashboard</p>
        </div>
      </header>

      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <Link
          href="/admin/home"
          className="flex h-16 items-center gap-2 border-b px-6 transition-colors hover:bg-muted/50"
        >
          <LayoutDashboard className="size-5 text-primary" />
          <span className="font-semibold text-foreground">Admin</span>
        </Link>
        <AdminNavLinks pathname={pathname} />
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

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <AdminAccessGate>{children}</AdminAccessGate>
        </div>
      </main>
    </div>
  );
}

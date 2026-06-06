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
  MoreVertical,
  Package,
  Settings,
  ShoppingCart,
  UserCircle2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
];

function AdminNavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 p-4">
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

function AdminSidebarFooter({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  const goToProfile = () => {
    onNavigate?.();
    router.push("/admin/profile");
  };

  return (
    <div className="flex shrink-0 items-center gap-1 border-t p-3">
      <Button
        variant="ghost"
        className="min-w-0 flex-1 justify-start gap-2 text-muted-foreground"
        onClick={onSignOut}
      >
        <LogOut className="size-4 shrink-0" />
        <span className="truncate">Sign out</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground"
              aria-label="Account menu"
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-40">
          <DropdownMenuItem onClick={goToProfile}>
            <UserCircle2 className="size-4" />
            Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
    NAV.find((item) => item.href === pathname)?.label ??
    (pathname === "/admin/profile" ? "Profile" : "Admin");

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
            <SheetHeader className="shrink-0 border-b px-4 py-4 text-left">
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
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AdminNavLinks
                pathname={pathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
            <AdminSidebarFooter
              onSignOut={handleSignOut}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {currentPage}
          </p>
          <p className="truncate text-xs text-muted-foreground">Admin dashboard</p>
        </div>
      </header>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <Link
          href="/admin/home"
          className="flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-colors hover:bg-muted/50"
        >
          <LayoutDashboard className="size-5 text-primary" />
          <span className="font-semibold text-foreground">Admin</span>
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminNavLinks pathname={pathname} />
        </div>
        <AdminSidebarFooter onSignOut={handleSignOut} />
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <AdminAccessGate>{children}</AdminAccessGate>
        </div>
      </main>
    </div>
  );
}

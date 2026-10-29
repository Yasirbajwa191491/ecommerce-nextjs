"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
export function AdminAccessGate({ children }: { children: React.ReactNode }) {
 const session = useQuery(api.auth.getSessionInfo), router = useRouter(), pathname = usePathname();
 useEffect(() => { if (session && !session.authenticated) router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`); }, [session, router, pathname]);
 if (!session || !session.authenticated) return <div role="status"><Spinner />Loading…</div>;
 if (!session.isAdmin) return <div className="p-8"><h1>Admin role required</h1><p>Ask a super administrator to grant access. Initial administrator setup is performed by the deployment operator.</p></div>;
 return <>{children}</>;
}

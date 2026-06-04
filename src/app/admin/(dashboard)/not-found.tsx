import { NotFoundPageView } from "@/components/errors/not-found-page-view";

export default function AdminDashboardNotFound() {
  return (
    <NotFoundPageView
      variant="admin-dashboard"
      description="This admin page doesn't exist. Use the sidebar or return to the dashboard."
    />
  );
}

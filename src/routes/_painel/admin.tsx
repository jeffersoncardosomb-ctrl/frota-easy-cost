import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_painel/admin")({
  component: LayoutAdmin,
});

function LayoutAdmin() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/visao-geral" replace />;
  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
      <Outlet />
    </div>
  );
}

import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  component: Gate,
});

function Gate() {
  const { user, loading, perfil } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && perfil) {
      if (perfil.status_aprovacao === "pendente" || perfil.status_aprovacao === "rejeitado") {
        navigate({ to: "/pendente" });
      }
    }
  }, [loading, user, perfil, navigate]);

  if (loading || !user || !perfil) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (perfil.status_aprovacao === "pendente" || perfil.status_aprovacao === "rejeitado") {
    return <Outlet />;
  }

  return <Outlet />;
}

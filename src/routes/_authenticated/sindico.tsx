import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Plug, Users, CalendarDays, BarChart3, UserCheck, Settings, Shield, LogOut } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sindico")({
  component: SindicoLayout,
});

function SindicoLayout() {
  const { perfil, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && perfil && perfil.role !== "sindico") {
      navigate({ to: "/morador/home" });
    }
  }, [loading, perfil, navigate]);

  const condoId = perfil?.condominio_id;
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-count", condoId],
    enabled: !!condoId && perfil?.role === "sindico",
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("perfis")
        .select("id", { count: "exact", head: true })
        .eq("condominio_id", condoId!)
        .eq("role", "morador")
        .eq("status_aprovacao", "pendente");
      return count ?? 0;
    },
  });

  return (
    <MobileFrame>
      <header className="flex items-center justify-between px-5 pt-5 pb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Síndico</span>
        <div className="flex items-center gap-2">
          <Link to="/sindico/compliance" className="h-10 w-10 rounded-full bg-card shadow-soft grid place-items-center" aria-label="Conformidade">
            <Shield size={18} />
          </Link>
          <Link to="/sindico/configuracoes" className="h-10 w-10 rounded-full bg-card shadow-soft grid place-items-center" aria-label="Configurações">
            <Settings size={18} />
          </Link>
          <Link to="/sindico/moradores" className="relative h-10 w-10 rounded-full bg-card shadow-soft grid place-items-center" aria-label="Aprovações pendentes">
            <UserCheck size={18} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </Link>
          <NotificationsBell />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto pb-2">
        <Outlet />
      </div>
      <BottomNav
        items={[
          { to: "/sindico/dashboard", label: "Painel", icon: LayoutDashboard },
          { to: "/sindico/carregadores", label: "Plugs", icon: Plug },
          { to: "/sindico/moradores", label: "Moradores", icon: Users },
          { to: "/sindico/reservas", label: "Reservas", icon: CalendarDays },
          { to: "/sindico/financeiro", label: "Finanças", icon: BarChart3 },
        ]}
      />
    </MobileFrame>
  );
}

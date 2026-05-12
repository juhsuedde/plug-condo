import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, CalendarPlus, ClipboardList, ListOrdered, User, Clock, XCircle, LogOut, Construction } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { NotificationsBell } from "@/components/NotificationsBell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/morador")({
  component: MoradorLayout,
});

function MoradorLayout() {
  const { perfil, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && perfil && perfil.role !== "morador") {
      navigate({ to: "/sindico/dashboard" });
    }
  }, [loading, perfil, navigate]);

  if (perfil && perfil.role === "morador" && perfil.status_aprovacao !== "aprovado") {
    const rejected = perfil.status_aprovacao === "rejeitado";
    return (
      <MobileFrame>
        <div className="flex-1 grid place-items-center px-6 text-center">
          <div className="space-y-5 max-w-[300px]">
            <div className={`h-20 w-20 mx-auto rounded-full grid place-items-center ${rejected ? "bg-destructive/10 text-destructive" : "bg-accent-soft text-accent"}`}>
              {rejected ? <XCircle size={40} /> : <Clock size={40} />}
            </div>
            <h1 className="text-xl font-extrabold">
              {rejected ? "Cadastro não aprovado" : "Cadastro em análise"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {rejected
                ? (perfil.motivo_rejeicao || "Seu cadastro foi rejeitado pelo síndico. Entre em contato com a administração do condomínio.")
                : "Seu cadastro está em análise pelo síndico. Você será notificado quando for aprovado."}
            </p>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-card shadow-soft text-sm font-semibold"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <header className="flex items-center justify-between px-5 pt-5 pb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Morador</span>
        <NotificationsBell />
      </header>
      <div className="flex-1 overflow-y-auto pb-2">
        <Outlet />
      </div>
      <BottomNav
        items={[
          { to: "/morador/home", label: "Início", icon: Home },
          { to: "/morador/reservar", label: "Reservar", icon: CalendarPlus },
          { to: "/morador/reservas", label: "Reservas", icon: ClipboardList },
          { to: "/morador/fila", label: "Fila", icon: ListOrdered },
          { to: "/morador/perfil", label: "Perfil", icon: User },
        ]}
      />
    </MobileFrame>
  );
}

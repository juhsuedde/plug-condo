import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, BellOff, Check, CheckCheck, Clock, Zap, CheckCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MobileFrame } from "@/components/MobileFrame";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  component: NotificacoesPage,
});

type Notification = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
};

const getNotificationIcon = (tipo: string, lida: boolean) => {
  const className = lida ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary";

  if (tipo === "fila") {
    return (
      <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${className}`}>
        <Clock size={16} />
      </div>
    );
  }
  if (tipo === "reserva") {
    return (
      <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${className}`}>
        <Zap size={16} />
      </div>
    );
  }
  if (tipo === "aprovacao") {
    return (
      <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${className}`}>
        <CheckCircle size={16} />
      </div>
    );
  }
  return (
    <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${className}`}>
      {lida ? <Check size={16} /> : <Bell size={16} />}
    </div>
  );
};

function NotificacoesPage() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"todas" | "nao_lidas">("todas");
  const pullStartY = useRef(0);
  const isPulling = useRef(false);

  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);

    const query = supabase
      .from("notifications")
      .select("*")
      .eq("perfil_id", perfil?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data } = await query;

    if (!showRefreshing) {
      setItems((data ?? []) as Notification[]);
      setLoading(false);
    } else {
      setItems((data ?? []) as Notification[]);
      setRefreshing(false);
    }
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil?.id) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("perfil_id", perfil.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled) {
        setItems((data ?? []) as Notification[]);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`notif-page-${perfil.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `perfil_id=eq.${perfil.id}` },
        () => fetchNotifications(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [perfil?.id, fetchNotifications]);

  const handlePullStart = (e: React.TouchEvent | React.MouseEvent) => {
    pullStartY.current = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    isPulling.current = true;
  };

  const handlePullMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPulling.current) return;
    const currentY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const diff = currentY - pullStartY.current;
    if (diff > 50 && window.scrollY === 0) {
      e.preventDefault();
    }
  };

  const handlePullEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (window.scrollY === 0) {
      await fetchNotifications(true);
    }
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await supabase.from("notifications").update({ lida: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!perfil?.id) return;
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    await supabase.from("notifications").update({ lida: true }).eq("perfil_id", perfil.id).eq("lida", false);
  };

  const goBack = () => {
    if (perfil?.role === "sindico") navigate({ to: "/sindico/dashboard" });
    else navigate({ to: "/morador/home" });
  };

  const filteredItems = filter === "nao_lidas" ? items.filter((n) => !n.lida) : items;
  const unread = items.filter((n) => !n.lida).length;

  return (
    <MobileFrame>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={goBack} className="h-10 w-10 rounded-full bg-card shadow-soft grid place-items-center" aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-extrabold">Notificações</h1>
        <button
          onClick={markAllRead}
          disabled={unread === 0}
          className="h-10 px-3 rounded-full bg-card shadow-soft grid place-items-center disabled:opacity-40"
          aria-label="Marcar todas como lidas"
        >
          <CheckCheck size={18} />
        </button>
      </header>

      <div className="flex gap-2 px-5 pb-3">
        <button
          onClick={() => setFilter("todas")}
          className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition ${
            filter === "todas" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter("nao_lidas")}
          className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition ${
            filter === "nao_lidas" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          Não lidas {unread > 0 && `(${unread})`}
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 pb-6 space-y-2"
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
        onMouseDown={handlePullStart}
        onMouseMove={handlePullMove}
        onMouseUp={handlePullEnd}
      >
        {refreshing && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin text-primary" size={20} />
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Carregando...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 mx-auto rounded-full bg-muted grid place-items-center text-muted-foreground">
              <BellOff size={28} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Você não tem notificações</p>
          </div>
        ) : (
          filteredItems.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.lida && markRead(n.id)}
              className={`w-full text-left p-4 rounded-2xl shadow-soft transition flex gap-3 ${
                n.lida ? "bg-card/60 opacity-60" : "bg-card border-l-4 border-primary"
              }`}
            >
              {getNotificationIcon(n.tipo, n.lida)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm ${n.lida ? "font-medium" : "font-bold"} truncate`}>{n.titulo}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.mensagem}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </MobileFrame>
  );
}

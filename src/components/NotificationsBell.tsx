import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function NotificationsBell() {
  const { perfil } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!perfil?.id) return;
    let cancelled = false;

    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("perfil_id", perfil.id)
        .eq("lida", false);
      if (!cancelled) setCount(count ?? 0);
    };

    load();

    const channel = supabase
      .channel(`notif-${perfil.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `perfil_id=eq.${perfil.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [perfil?.id]);

  return (
    <Link
      to="/notificacoes"
      aria-label="Notificações"
      className="relative h-10 w-10 rounded-full bg-card shadow-soft grid place-items-center"
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

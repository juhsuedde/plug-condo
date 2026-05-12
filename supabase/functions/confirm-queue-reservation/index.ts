// Confirms a fila_espera notification within the 10-min window and creates a 1h reservation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notification_id, accept } = await req.json();
    if (!notification_id) throw new Error("notification_id required");

    const { data: notif, error: nErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single();
    if (nErr) throw nErr;

    if (notif.expira_em && new Date(notif.expira_em) < new Date()) {
      // expired -> remove from queue and process next
      await supabase
        .from("fila_espera")
        .delete()
        .eq("perfil_id", notif.perfil_id)
        .eq("carregador_id", notif.carregador_id);
      await supabase.functions.invoke("process-queue", {
        body: { carregador_id: notif.carregador_id },
      });
      return new Response(JSON.stringify({ status: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!accept) {
      await supabase
        .from("fila_espera")
        .delete()
        .eq("perfil_id", notif.perfil_id)
        .eq("carregador_id", notif.carregador_id);
      await supabase.from("notifications").update({ lida: true }).eq("id", notification_id);
      await supabase.functions.invoke("process-queue", {
        body: { carregador_id: notif.carregador_id },
      });
      return new Response(JSON.stringify({ status: "declined" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create 1-hour reservation starting now
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const data = now.toISOString().slice(0, 10);
    const hora_inicio = now.toTimeString().slice(0, 8);
    const hora_fim = end.toTimeString().slice(0, 8);

    const { data: reserva, error: rErr } = await supabase
      .from("reservas")
      .insert({
        carregador_id: notif.carregador_id,
        perfil_id: notif.perfil_id,
        data,
        hora_inicio,
        hora_fim,
        status: "ativa",
      })
      .select()
      .single();
    if (rErr) throw rErr;

    await supabase
      .from("carregadores")
      .update({ status: "em_uso" })
      .eq("id", notif.carregador_id);
    await supabase
      .from("fila_espera")
      .delete()
      .eq("perfil_id", notif.perfil_id)
      .eq("carregador_id", notif.carregador_id);
    await supabase.from("notifications").update({ lida: true }).eq("id", notification_id);

    return new Response(JSON.stringify({ status: "confirmed", reserva_id: reserva.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[confirm-queue] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

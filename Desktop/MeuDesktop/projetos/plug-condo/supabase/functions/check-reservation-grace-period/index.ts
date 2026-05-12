// @ts-nocheck
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[grace-period] starting check");

    const today = new Date().toISOString().slice(0, 10);
    const gracePeriodMinutes = 15;

    const { data: staleReservations, error } = await supabase
      .from("reservas")
      .select("id, perfil_id, carregador_id, data, hora_inicio")
      .eq("status", "ativa")
      .is("kwh_consumido", null)
      .eq("data", today);

    if (error) throw error;

    const toCancel: string[] = [];

    for (const reserva of staleReservations ?? []) {
      const start = new Date(`${reserva.data}T${reserva.hora_inicio}`);
      if (Date.now() - start.getTime() > gracePeriodMinutes * 60 * 1000) {
        toCancel.push(reserva.id);

        await supabase.from("reservas").update({ status: "cancelada" }).eq("id", reserva.id);

        if (reserva.carregador_id) {
          await supabase.from("carregadores").update({ status: "disponivel" }).eq("id", reserva.carregador_id);
        }

        const { data: transacao } = await supabase
          .from("transacoes")
          .select("perfil_id, status_pagamento")
          .eq("reserva_id", reserva.id)
          .single();

        if (transacao) {
          const novoStatus = transacao.status_pagamento === "pago" ? "reembolsado" : "cancelado";
          await supabase.from("transacoes").update({ status_pagamento: novoStatus }).eq("reserva_id", reserva.id);
        }

        if (reserva.perfil_id && reserva.carregador_id) {
          await supabase.from("notifications").insert({
            perfil_id: reserva.perfil_id,
            tipo: "reserva",
            titulo: "Reserva cancelada",
            mensagem: "Sua reserva foi cancelada por não iniciar a recarga no prazo de 15 minutos.",
            carregador_id: reserva.carregador_id,
          });
        }

        if (reserva.carregador_id) {
          const { data: nextInQueue } = await supabase
            .from("fila_espera")
            .select("perfil_id")
            .eq("carregador_id", reserva.carregador_id)
            .order("posicao", { ascending: true })
            .order("hora_entrada", { ascending: true })
            .limit(1)
            .single();

          if (nextInQueue) {
            const expiraEm = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            await supabase
              .from("fila_espera")
              .update({ notificado: true, expira_em: expiraEm })
              .eq("carregador_id", reserva.carregador_id)
              .eq("posicao", 1);

            const { data: carregador } = await supabase
              .from("carregadores")
              .select("nome")
              .eq("id", reserva.carregador_id)
              .single();

            await supabase.from("notifications").insert({
              perfil_id: nextInQueue.perfil_id,
              tipo: "fila",
              titulo: "Sua vez chegou!",
              mensagem: `O carregador ${carregador?.nome || ""} foi liberado. Confirme sua reserva em até 10 minutos.`,
              carregador_id: reserva.carregador_id,
              expira_em: expiraEm,
            });
          }
        }
      }
    }

    console.log(`[grace-period] cancelled ${toCancel.length} reservations`);

    return new Response(
      JSON.stringify({ cancelled_count: toCancel.length, cancelled_ids: toCancel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[grace-period] error", err);
    return new Response(
      JSON.stringify({ cancelled_count: 0, cancelled_ids: [], error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

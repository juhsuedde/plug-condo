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
    const { reserva_id } = await req.json();

    if (!reserva_id) {
      return new Response(
        JSON.stringify({ error: "reserva_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: reserva, error: rErr } = await supabase
      .from("reservas")
      .select("id, perfil_id, carregador_id, hora_inicio, hora_fim, kwh_consumido")
      .eq("id", reserva_id)
      .single();

    if (rErr || !reserva) {
      return new Response(
        JSON.stringify({ error: "Reserva não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: carregador, error: cErr } = await supabase
      .from("carregadores")
      .select("id, potencia_kw, condominio_id")
      .eq("id", reserva.carregador_id)
      .single();

    if (cErr || !carregador) {
      return new Response(
        JSON.stringify({ error: "Carregador não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: condominio, error: condoErr } = await supabase
      .from("condominios")
      .select("preco_kwh, taxa_uso, duracao_padrao_horas")
      .eq("id", carregador.condominio_id)
      .single();

    if (condoErr || !condominio) {
      return new Response(
        JSON.stringify({ error: "Condomínio não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let kwh_consumido: number;

    if (reserva.kwh_consumido !== null && reserva.kwh_consumido !== undefined) {
      kwh_consumido = Number(reserva.kwh_consumido);
    } else {
      const potencia_kw = Number(carregador.potencia_kw);
      let durationHours: number;

      if (reserva.hora_inicio && reserva.hora_fim) {
        const inicio = new Date(reserva.hora_inicio);
        const fim = new Date(reserva.hora_fim);
        durationHours = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
      } else {
        durationHours = Number(condominio.duracao_padrao_horas) || 2;
      }

      kwh_consumido = potencia_kw * durationHours;
    }

    const valor_energia = Number((kwh_consumido * Number(condominio.preco_kwh)).toFixed(2));
    const valor_taxa = Number(condominio.taxa_uso);
    const valor_total = Number((valor_energia + valor_taxa).toFixed(2));

    const { error: updateReservaErr } = await supabase
      .from("reservas")
      .update({ kwh_consumido: kwh_consumido, custo_total: valor_total })
      .eq("id", reserva_id);

    if (updateReservaErr) throw updateReservaErr;

    const { data: transacao, error: updateTxErr } = await supabase
      .from("transacoes")
      .update({ valor_energia, valor_taxa, valor_total })
      .eq("reserva_id", reserva_id)
      .select("perfil_id")
      .single();

    if (updateTxErr) {
      console.error("Error updating transacao:", updateTxErr);
    }

    if (reserva.perfil_id) {
      await supabase.from("notifications").insert({
        perfil_id: reserva.perfil_id,
        tipo: "reserva",
        titulo: "Recarga finalizada!",
        mensagem: `Total: R$ ${valor_total.toFixed(2).replace(".", ",")}`,
        carregador_id: reserva.carregador_id,
      });
    }

    return new Response(
      JSON.stringify({ reserva_id, kwh_consumido, custo_total: valor_total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[calculate-cost] error", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

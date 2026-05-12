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
    const { reserva_id } = await req.json();
    if (!reserva_id) throw new Error("reserva_id required");

    console.log(`[calculate-cost] reserva ${reserva_id}`);

    const { data: reserva, error: rErr } = await supabase
      .from("reservas")
      .select("*, carregadores(condominio_id)")
      .eq("id", reserva_id)
      .single();
    if (rErr) throw rErr;

    const condoId = (reserva.carregadores as { condominio_id: string }).condominio_id;
    const { data: condo, error: cErr } = await supabase
      .from("condominios")
      .select("preco_kwh, taxa_uso")
      .eq("id", condoId)
      .single();
    if (cErr) throw cErr;

    const kwh = Number(reserva.kwh_consumido ?? 0);
    const valor_energia = +(kwh * Number(condo.preco_kwh)).toFixed(2);
    const valor_taxa = Number(condo.taxa_uso);
    const valor_total = +(valor_energia + valor_taxa).toFixed(2);

    await supabase.from("reservas").update({ custo_total: valor_total }).eq("id", reserva_id);

    const { data: tx, error: tErr } = await supabase
      .from("transacoes")
      .insert({
        reserva_id,
        perfil_id: reserva.perfil_id,
        valor_energia,
        valor_taxa,
        valor_total,
        status_pagamento: "pendente",
      })
      .select()
      .single();
    if (tErr) throw tErr;

    console.log(`[calculate-cost] total=${valor_total} tx=${tx.id}`);

    return new Response(
      JSON.stringify({ valor_energia, valor_taxa, valor_total, transacao_id: tx.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[calculate-cost] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

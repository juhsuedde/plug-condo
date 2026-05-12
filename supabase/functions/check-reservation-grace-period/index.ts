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
    console.log("[grace-period] starting check");

    const today = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const cutoffTime = cutoff.toTimeString().slice(0, 8);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    // Find ativa reservations whose hora_inicio + 15min has passed and no kwh
    const { data: stale, error } = await supabase
      .from("reservas")
      .select("id, carregador_id, data, hora_inicio")
      .eq("status", "ativa")
      .is("kwh_consumido", null)
      .lte("data", today);
    if (error) throw error;

    const toCancel = (stale ?? []).filter((r) => {
      const start = new Date(`${r.data}T${r.hora_inicio}`);
      return Date.now() - start.getTime() > 15 * 60 * 1000;
    });

    console.log(`[grace-period] cancelling ${toCancel.length} reservations`);

    for (const r of toCancel) {
      await supabase.from("reservas").update({ status: "cancelada" }).eq("id", r.id);
      // trigger will set carregador to disponivel and process queue
    }

    return new Response(
      JSON.stringify({ checked: stale?.length ?? 0, cancelled: toCancel.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[grace-period] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

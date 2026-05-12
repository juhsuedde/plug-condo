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
    const { carregador_id } = await req.json();
    if (!carregador_id) throw new Error("carregador_id required");

    console.log(`[process-queue] carregador ${carregador_id}`);

    // Reorder: get all entries sorted, renumber positions
    const { data: queue, error: qErr } = await supabase
      .from("fila_espera")
      .select("*")
      .eq("carregador_id", carregador_id)
      .order("posicao", { ascending: true });
    if (qErr) throw qErr;

    if (!queue || queue.length === 0) {
      console.log("[process-queue] empty queue");
      return new Response(JSON.stringify({ processed: false, reason: "empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Renumber positions
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].posicao !== i + 1) {
        await supabase.from("fila_espera").update({ posicao: i + 1 }).eq("id", queue[i].id);
      }
    }

    const next = queue[0];

    // Notify the next user with 10-min expiry
    const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: nErr } = await supabase.from("notifications").insert({
      perfil_id: next.perfil_id,
      tipo: "fila_disponivel",
      titulo: "Carregador disponível!",
      mensagem: "Você tem 10 minutos para confirmar sua reserva.",
      carregador_id,
      expira_em: expira,
    });
    if (nErr) throw nErr;

    await supabase.from("fila_espera").update({ notificado: true }).eq("id", next.id);

    console.log(`[process-queue] notified ${next.perfil_id}, expires ${expira}`);

    return new Response(
      JSON.stringify({ processed: true, perfil_id: next.perfil_id, expira_em: expira }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[process-queue] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSupabase = (authHeader: string | null) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (authHeader?.startsWith("Bearer ")) {
    return createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
  }

  return createClient(supabaseUrl, serviceKey);
};

const authenticate = async (authHeader: string | null, supabase: any) => {
  if (!authHeader) {
    return { authenticated: false, error: "Token de autenticação não fornecido" };
  }

  if (authHeader.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { authenticated: false, error: "Token inválido" };
    }
    return { authenticated: true, user };
  }

  return { authenticated: false, error: "Formato de token inválido" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");

  try {
    const { carregador_id } = await req.json();

    if (!carregador_id) {
      return new Response(
        JSON.stringify({ error: "carregador_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabase(authHeader);
    const auth = await authenticate(authHeader, supabase);

    if (!auth.authenticated) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: carregador, error: carregadorErr } = await supabase
      .from("carregadores")
      .select("id, nome")
      .eq("id", carregador_id)
      .single();

    if (carregadorErr || !carregador) {
      return new Response(
        JSON.stringify({ error: "Carregador não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: nextInQueue, error: queueErr } = await supabase
      .from("fila_espera")
      .select("*")
      .eq("carregador_id", carregador_id)
      .order("posicao", { ascending: true })
      .order("hora_entrada", { ascending: true })
      .limit(1)
      .single();

    if (queueErr || !nextInQueue) {
      return new Response(
        JSON.stringify({ message: "Queue empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiraEm = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from("fila_espera")
      .update({ notificado: true, expira_em: expiraEm })
      .eq("id", nextInQueue.id);

    if (updateErr) throw updateErr;

    const { error: notifErr } = await supabase.from("notifications").insert({
      perfil_id: nextInQueue.perfil_id,
      tipo: "fila",
      titulo: "Sua vez chegou!",
      mensagem: `O carregador ${carregador.nome} foi liberado. Confirme sua reserva em até 10 minutos.`,
      carregador_id,
      expira_em: expiraEm,
    });

    if (notifErr) throw notifErr;

    const { data: remainingQueue, error: remainingErr } = await supabase
      .from("fila_espera")
      .select("id, posicao")
      .eq("carregador_id", carregador_id)
      .neq("id", nextInQueue.id);

    if (!remainingErr && remainingQueue) {
      for (const entry of remainingQueue) {
        await supabase
          .from("fila_espera")
          .update({ posicao: entry.posicao - 1 })
          .eq("id", entry.id);
      }
    }

    return new Response(
      JSON.stringify({ message: "Queue processed", notified_perfil_id: nextInQueue.perfil_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[process-queue] error", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

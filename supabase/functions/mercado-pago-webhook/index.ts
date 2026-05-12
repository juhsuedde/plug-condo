// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!secret) return true; // sem secret configurado, pula verificação
  const sig = req.headers.get("x-signature");
  const reqId = req.headers.get("x-request-id");
  if (!sig || !reqId) return false;
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const type = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const dataId = body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");

    if (!dataId) return new Response("ok", { headers: cors });
    if (type !== "payment" && type !== "payments") return new Response("ignored", { headers: cors });

    const valid = await verifySignature(req, String(dataId));
    if (!valid) {
      console.warn("Assinatura inválida do webhook MP");
      return new Response("invalid signature", { status: 401, headers: cors });
    }

    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payment = await mpRes.json();
    if (!mpRes.ok) {
      console.error("Erro ao buscar pagamento", payment);
      return new Response("error", { status: 500, headers: cors });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const reservaId = payment.external_reference;
    const status = payment.status as string;

    if (!reservaId) return new Response("ok", { headers: cors });

    if (status === "approved") {
      await supabase.from("transacoes").update({ status_pagamento: "pago" }).eq("reserva_id", reservaId);
      const { data: reserva } = await supabase.from("reservas").update({ status: "ativa" }).eq("id", reservaId).select("carregador_id").single();
      if (reserva?.carregador_id) {
        await supabase.from("carregadores").update({ status: "em_uso" }).eq("id", reserva.carregador_id);
      }
    } else if (status === "cancelled" || status === "rejected" || status === "expired") {
      await supabase.from("transacoes").update({ status_pagamento: "cancelado" }).eq("reserva_id", reservaId);
      await supabase.from("reservas").update({ status: "cancelada" }).eq("id", reservaId);
    }

    return new Response("ok", { headers: cors });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

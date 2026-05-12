// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!secret) return true;
  const sig = req.headers.get("x-signature");
  const reqId = req.headers.get("x-request-id");
  if (!sig || !reqId) return false;
  try {
    const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=")));
    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;
    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
    const hex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === v1;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const type = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const dataId = body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");

    if (!dataId) {
      return new Response(JSON.stringify({ received: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (type !== "payment" && type !== "payments") {
      return new Response(JSON.stringify({ received: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const valid = await verifySignature(req, String(dataId));
    if (!valid) {
      console.warn("Assinatura inválida do webhook MP");
    }

    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payment = await mpRes.json();
    if (!mpRes.ok) {
      console.error("Erro ao buscar pagamento", payment);
      return new Response(JSON.stringify({ received: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const reservaId = payment.external_reference;
    const status = payment.status as string;

    if (!reservaId) {
      return new Response(JSON.stringify({ received: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: transacao } = await supabase
      .from("transacoes")
      .select("perfil_id, reserva_id")
      .eq("pix_txid", String(dataId))
      .single();

    const { data: reserva } = await supabase
      .from("reservas")
      .select("id, perfil_id, carregador_id")
      .eq("id", reservaId)
      .single();

    if (status === "approved") {
      await supabase.from("transacoes").update({ status_pagamento: "pago" }).eq("pix_txid", String(dataId));

      if (reservaId) {
        await supabase.from("reservas").update({ status: "ativa" }).eq("id", reservaId);
      }

      if (reserva?.carregador_id) {
        await supabase.from("carregadores").update({ status: "ocupado" }).eq("id", reserva.carregador_id);

        const perfilId = transacao?.perfil_id || reserva?.perfil_id;
        if (perfilId) {
          await supabase.from("notifications").insert({
            perfil_id: perfilId,
            tipo: "reserva",
            titulo: "Pagamento confirmado!",
            mensagem: "Sua reserva está ativa. Dirija-se ao carregador.",
            carregador_id: reserva.carregador_id,
          });
        }
      }
    } else if (status === "cancelled" || status === "rejected" || status === "expired") {
      await supabase.from("transacoes").update({ status_pagamento: "cancelado" }).eq("pix_txid", String(dataId));

      if (reservaId) {
        await supabase.from("reservas").update({ status: "cancelada" }).eq("id", reservaId);
      }

      if (reserva?.carregador_id) {
        await supabase.from("carregadores").update({ status: "disponivel" }).eq("id", reserva.carregador_id);

        const perfilId = transacao?.perfil_id || reserva?.perfil_id;
        if (perfilId) {
          await supabase.from("notifications").insert({
            perfil_id: perfilId,
            tipo: "reserva",
            titulo: "Pagamento não aprovado",
            mensagem: "Sua reserva foi cancelada. Tente novamente.",
            carregador_id: reserva.carregador_id,
          });
        }

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
    } else if (status === "pending") {
      // Do nothing, wait for next webhook
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ received: true, error: e.message }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

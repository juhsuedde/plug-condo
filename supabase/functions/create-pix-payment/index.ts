// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { reserva_id, valor_total } = await req.json();
    if (!reserva_id || !valor_total) {
      return new Response(JSON.stringify({ error: "reserva_id e valor_total obrigatórios" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Lookup reserva + perfil para email do pagador
    const { data: reserva, error: rErr } = await supabase
      .from("reservas")
      .select("id, perfil_id, perfis:perfil_id(email, nome, cpf)")
      .eq("id", reserva_id)
      .single();
    if (rErr || !reserva) throw new Error("Reserva não encontrada");

    const perfil: any = (reserva as any).perfis;
    const expiration = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const idempotencyKey = `${reserva_id}-${Date.now()}`;
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: Number(Number(valor_total).toFixed(2)),
        description: `Reserva PlugCondo ${reserva_id.slice(0, 8)}`,
        payment_method_id: "pix",
        date_of_expiration: expiration.replace("Z", "-00:00"),
        payer: {
          email: perfil?.email || "test_user@plugcondo.com",
          first_name: perfil?.nome?.split(" ")?.[0] || "Morador",
          identification: perfil?.cpf ? { type: "CPF", number: String(perfil.cpf).replace(/\D/g, "") } : undefined,
        },
        external_reference: reserva_id,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
      }),
    });

    const mp = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP error", mp);
      return new Response(JSON.stringify({ error: mp.message || "Erro ao criar pagamento Pix", details: mp }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const tx = mp.point_of_interaction?.transaction_data;
    const payment_id = String(mp.id);

    // Persistir pix_txid na transação existente
    await supabase
      .from("transacoes")
      .update({ pix_txid: payment_id })
      .eq("reserva_id", reserva_id);

    return new Response(
      JSON.stringify({
        payment_id,
        qr_code: tx?.qr_code,
        qr_code_base64: tx?.qr_code_base64,
        ticket_url: tx?.ticket_url,
        expiration_date: expiration,
        status: mp.status,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

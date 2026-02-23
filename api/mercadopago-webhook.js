import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("🔥 Webhook llamado");

  try {
    // ✅ MercadoPago puede enviar POST o GET
    const paymentId =
      req.body?.data?.id ||
      req.query?.data_id ||
      req.query?.id;

    console.log("Payment ID recibido:", paymentId);

    if (!paymentId) {
      console.log("⚠️ No payment_id");
      return res.status(200).send("ok");
    }

    // ✅ Consultar pago REAL en MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpResponse.json();

    console.log("Estado pago:", payment.status);

    if (payment.status !== "approved") {
      return res.status(200).send("ok");
    }

    const email = payment.external_reference;

    console.log("Activando premium para:", email);

    // ✅ Actualizar Supabase
    const { error } = await supabase
      .from("users2")
      .update({
        acceso_premium: true,
        estado_pago: "approved",
        payment_id: paymentId,
      })
      .eq("email", email);

    if (error) {
      console.error("Supabase error:", error);
    } else {
      console.log("✅ Usuario actualizado");
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("🔥 ERROR WEBHOOK:", err);

    // ⚠️ IMPORTANTE:
    // MercadoPago necesita 200 aunque haya error
    return res.status(200).send("ok");
  }
}

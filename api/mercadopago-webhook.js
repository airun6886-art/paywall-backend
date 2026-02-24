import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log("🔥 WEBHOOK HIT");
    console.log("METHOD:", req.method);

    if (req.method !== "POST") {
      return res.status(200).send("ok");
    }

    console.log("BODY:", JSON.stringify(req.body));

    const paymentId =
      req.body?.data?.id ||
      req.query["data.id"];

    console.log("Payment ID:", paymentId);

    if (!paymentId) {
      console.log("⚠️ No payment_id recibido");
      return res.status(200).send("ok");
    }

    // 🔎 Consultar pago real en MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpResponse.json();

    console.log("Pago MP status:", payment.status);

    if (payment.status !== "approved") {
      console.log("Pago no aprobado aún");
      return res.status(200).send("ok");
    }

    const email = payment.external_reference;

    if (!email) {
      console.log("⚠️ No external_reference (email)");
      return res.status(200).send("ok");
    }

    console.log("Activando premium para:", email);

    // 🚀 UPSERT (crea si no existe, actualiza si existe)
    const { data, error } = await supabase
      .from("users2")
      .upsert(
        {
          email: email,
          acceso_premium: true,
          estado_pago: "approved",
          payment_id: paymentId,
        },
        { onConflict: "email" }
      );

    console.log("Supabase result:", data);
    console.log("Supabase error:", error);

    if (error) {
      console.error("❌ Error actualizando Supabase:", error);
      return res.status(500).send("error");
    }

    console.log("✅ Usuario premium activado correctamente");

    return res.status(200).send("ok");
  } catch (err) {
    console.error("🔥 ERROR WEBHOOK:", err);
    return res.status(500).send("error");
  }
}

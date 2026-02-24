console.log("USER ID:", req.body.user_id);
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
    console.log("BODY:", JSON.stringify(req.body));

    const paymentId =
      req.body?.data?.id ||
      req.query["data.id"];

    console.log("Payment ID:", paymentId);

    if (!paymentId) {
      console.log("⚠️ No payment_id recibido");
      return res.status(200).send("ok");
    }

    // CONSULTAR MP
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpResponse.json();

    console.log("Pago MP:", payment);

    if (payment.status !== "approved") {
      console.log("Pago no aprobado");
      return res.status(200).send("ok");
    }

    const email = payment.external_reference;

    console.log("Activando premium para:", email);

    const { data, error } = await supabase
      .from("users2")
      .update({
        acceso_premium: true,
        estado_pago: "approved",
        payment_id: paymentId,
      })
      .eq("email", email);

    console.log("Supabase result:", data);
    console.log("Supabase error:", error);

    res.status(200).send("ok");
  } catch (err) {
    console.error("🔥 ERROR WEBHOOK:", err);
    res.status(500).send("error");
  }
}

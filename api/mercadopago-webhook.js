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
    console.log("USER ID:", req.body?.user_id);

    if (req.method !== "POST") {
      return res.status(200).send("ok");
    }

    const paymentId =
      req.body?.data?.id ||
      req.query["data.id"];

    console.log("Payment ID:", paymentId);

    if (!paymentId) {
      return res.status(200).send("ok");
    }

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
      return res.status(200).send("ok");
    }

    const email = payment.external_reference;

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

    return res.status(200).send("ok");
  } catch (err) {
    console.error("🔥 ERROR WEBHOOK:", err);
    return res.status(500).send("error");
  }
}

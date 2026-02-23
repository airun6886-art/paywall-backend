import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const body = req.body;

    console.log("Webhook recibido:", body);

    // Solo pagos
    if (body.type !== "payment") {
      return res.status(200).send("ok");
    }

    const paymentId = body.data.id;

    // Consultar pago real en MercadoPago
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await response.json();

    if (payment.status === "approved") {
      const email = payment.payer.email;

      await supabase
        .from("users2")
        .update({
          estado_pago: "approved",
          acceso_premium: true,
          payment_id: paymentId,
        })
        .eq("email", email);

      console.log("✅ Premium activado:", email);
    }

    res.status(200).send("ok");
  } catch (error) {
    console.error(error);
    res.status(500).send("error");
  }
}

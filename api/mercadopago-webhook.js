import fetch from "node-fetch";

export default async function handler(req, res) {

  // ===== DEBUG WEBHOOK =====
  console.log("=== Webhook recibido ===");
  console.log("Método HTTP:", req.method);
  console.log("Query params:", req.query);
  console.log("Body:", req.body);
  // =========================

  try {
    const { type, data } = req.query;

    // Mercado Pago envía notificaciones por query
    if (type !== "payment") {
      return res.status(200).send("ok");
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.status(400).send("No payment id");
    }

    // Consultar el pago real a Mercado Pago
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpRes.json();

    console.log("Pago obtenido desde MercadoPago:", payment);

    if (payment.status === "approved") {
      const email = payment.payer?.email;

      console.log("Email del pagador:", email);

      // Actualizar en Supabase
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/users2?email=eq.${email}`,
        {
          method: "PATCH",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            estado_pago: "approved",
            acceso_premium: true,
            payment_id: paymentId,
          }),
        }
      );

      console.log("Usuario actualizado en Supabase");
    }

    return res.status(200).send("ok");

  } catch (err) {
    console.error("Error en webhook:", err);
    return res.status(500).send("error");
  }
}


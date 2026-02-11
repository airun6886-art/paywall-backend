import fetch from "node-fetch";

export default async function handler(req, res) {
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
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
    });

    const payment = await mpRes.json();

    if (payment.status === "approved") {
      const email = payment.payer?.email;

      // Actualizar en Supabase
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${email}`, {
        method: "PATCH",
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          estado_pago: "approved",
          acceso_premium: true,
          payment_id: paymentId,
        }),
      });
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    return res.status(500).send("error");
  }
}

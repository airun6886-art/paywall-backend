import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { payment_id, status, external_reference } = req.query;

    if (!payment_id || !status || !external_reference) {
      return res.status(400).json({ error: "Faltan parámetros" });
    }

    // Verificar pago real con MercadoPago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
    });

    const paymentData = await mpRes.json();

    if (paymentData.status !== "approved") {
      return res.status(200).json({
        ok: false,
        message: "Pago no aprobado",
        status: paymentData.status,
      });
    }

    // Actualizar Supabase
    const sbRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/users2?email=eq.${external_reference}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          acceso_premium: true,
          estado_pago: "approved",
        }),
      }
    );

    if (!sbRes.ok) {
      const t = await sbRes.text();
      console.error("Error Supabase:", t);
      return res.status(500).json({ error: "Error actualizando Supabase" });
    }

    return res.status(200).json({
      ok: true,
      message: "Pago verificado y usuario activado como premium",
      payment_id,
      email: external_reference,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error en verificación de pago" });
  }
}

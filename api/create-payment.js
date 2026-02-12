export default async function handler(req, res) {
  try {
    const email = req.method === "POST" ? req.body.email : req.query.email;

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    const preference = {
      items: [
        {
          title: "Acceso Premium",
          quantity: 1,
          unit_price: 100,
          currency_id: "MXN",
        },
      ],

      // ❌ QUITAMOS esto para evitar OTP en sandbox
      // payer: { email },

      binary_mode: true, // 👈 ayuda a evitar estados intermedios

      back_urls: {
        success: "https://paywall-backend-pink.vercel.app/api/success",
        failure: "https://paywall-backend-pink.vercel.app/api/failure",
        pending: "https://paywall-backend-pink.vercel.app/api/pending",
      },

      auto_return: "approved",
      external_reference: email, // 👈 aquí sí mantenemos el email
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await mpRes.json();
    return res.status(200).json({ init_point: data.init_point });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error creando pago" });
  }
}


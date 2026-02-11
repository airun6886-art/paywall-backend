import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    const preference = {
      items: [
        {
          title: "Acceso Premium",
          quantity: 1,
          unit_price: 100, // precio de prueba
        },
      ],
      payer: { email },
      back_urls: {
        success: "https://tu-landing.com/success",
        failure: "https://tu-landing.com/failure",
        pending: "https://tu-landing.com/pending",
      },
      auto_return: "approved",
      external_reference: email,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
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

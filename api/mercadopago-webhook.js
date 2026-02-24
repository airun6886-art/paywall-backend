import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// FUNCION PARA VALIDAR FIRMA (opcional, producción)
function validateMpSignature(req) {
  const mpHeader = req.headers["x-mp-signature"];
  if (!mpHeader || !process.env.MP_WEBHOOK_KEY) return false;
  const hash = crypto
    .createHmac("sha256", process.env.MP_WEBHOOK_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");
  return hash === mpHeader;
}

export default async function handler(req, res) {
  try {
    console.log("🔥 WEBHOOK HIT");
    console.log("METHOD:", req.method);
    console.log("BODY:", JSON.stringify(req.body));

    if (req.method !== "POST") return res.status(200).send("ok");

    // Validación de firma (descomentar si se configura MP webhook secret)
    // if (!validateMpSignature(req)) {
    //   console.log("❌ Firma inválida");
    //   return res.status(401).send("invalid signature");
    // }

    const paymentId = req.body?.data?.id || req.body?.id;
    if (!paymentId) {
      console.log("⚠️ No payment_id recibido");
      return res.status(200).send("ok");
    }

    console.log("Payment ID:", paymentId);

    // CONSULTAR PAGO REAL EN MERCADOPAGO
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    const payment = await mpRes.json();
    console.log("Pago MP:", payment);

    if (payment.status !== "approved") {
      console.log("Pago no aprobado, abortando");
      return res.status(200).send("ok");
    }

    const email = payment.external_reference;
    if (!email) {
      console.log("⚠️ No external_reference, no se puede asignar usuario");
      return res.status(200).send("ok");
    }

    // UPSERT SEGURO - evita doble activación
    const { data, error } = await supabase
      .from("users2")
      .upsert(
        {
          email,
          estado_pago: "approved",
          acceso_premium: true,
          payment_id: paymentId,
        },
        {
          onConflict: ["payment_id"], // si payment_id ya existe → no hace nada
          ignoreDuplicates: true,     // retries no rompen la tabla
        }
      );

    if (error) console.log("⚠️ Error Supabase:", error);
    else console.log("✅ Usuario activado/upsert:", data);

    return res.status(200).send("ok");
  } catch (err) {
    console.error("🔥 ERROR WEBHOOK:", err);
    return res.status(500).send("error");
  }
}

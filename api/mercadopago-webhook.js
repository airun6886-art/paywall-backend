import fetch from 'node-fetch';

// Asegúrate de tener tus variables de entorno correctas para MercadoPago
const { MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

export default async function handler(req, res) {
  // Parámetros que MercadoPago manda a la URL de éxito
  const { payment_id, status, external_reference } = req.query;

  if (!payment_id || !status || !external_reference) {
    return res.status(400).json({ error: "Faltan parámetros (payment_id, status, external_reference)" });
  }

  try {
    // Hacer la solicitud a la API de MercadoPago para verificar el estado del pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    const paymentData = await mpRes.json();

    // Verificar si el pago fue aprobado
    if (paymentData.status === 'approved') {
      // Si el pago fue aprobado, actualizamos el estado del usuario en Supabase
      await updateUserStatus(external_reference, true);

      return res.status(200).json({
        message: "Pago aprobado",
        data: paymentData,
      });
    } else {
      // Si el pago no fue aprobado
      await updateUserStatus(external_reference, false);

      return res.status(200).json({
        message: "Pago no aprobado",
        data: paymentData,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error verificando el pago" });
  }
}

// Función para actualizar el estado del usuario en Supabase
async function updateUserStatus(email, isPremium) {
  const { data, error } = await fetch(`${SUPABASE_URL}/rest/v1/users2?email=eq.${email}`, {
    method: 'PATCH',
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      acceso_premium: isPremium,
      estado_pago: isPremium ? 'approved' : 'rejected',
    }),
  }).then(res => res.json());

  if (error) {
    console.error("Error al actualizar estado de pago:", error);
  }
}


export default async function handler(req, res) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    const supaRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${email}&select=acceso_premium,estado_pago`,
      {
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const data = await supaRes.json();
    const user = data?.[0];

    return res.status(200).json({
      acceso_premium: !!user?.acceso_premium,
      estado_pago: user?.estado_pago || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error consultando estado" });
  }
}

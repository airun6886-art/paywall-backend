export default async function handler(req, res) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    // Verificar si ya existe
    const checkRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/users2?email=eq.${email}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const existingUser = await checkRes.json();

    if (existingUser.length > 0) {
      return res.status(200).json({
        message: "Usuario ya existe",
        user: existingUser[0],
      });
    }

    // Insertar nuevo usuario
    const insertRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/users2`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          acceso_premium: false,
          estado_pago: "pending",
        }),
      }
    );

    const newUser = await insertRes.json();

    return res.status(200).json({
      message: "Usuario creado",
      user: newUser,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error creando usuario" });
  }
}

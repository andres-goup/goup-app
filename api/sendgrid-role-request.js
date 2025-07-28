// api/sendgrid-role-request.js

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method Not Allowed" });
      return;
    }

    const { email, nombre, fecha_nacimiento, calle, ciudad, comuna, pais, tipo_solicitud } =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    const API_KEY = process.env.SENDGRID_API_KEY;
    const FROM = process.env.SENDGRID_FROM || "no-reply@example.com";
    const TO = process.env.MAIL_TO || "pablo@goupevents.cl";

    if (!API_KEY) {
      console.error("SENDGRID_API_KEY no está definido");
      res.status(500).json({ ok: false, error: "SENDGRID_API_KEY missing" });
      return;
    }
    if (!API_KEY.startsWith("SG.")) {
      console.error("API key does not start with \"SG.\".");
      res.status(500).json({ ok: false, error: "Invalid SENDGRID_API_KEY format" });
      return;
    }

    const html = `
      <h2>Solicitud de acceso</h2>
      <ul>
        <li><b>Email:</b> ${email || "—"}</li>
        <li><b>Nombre:</b> ${nombre || "—"}</li>
        <li><b>Fecha nacimiento:</b> ${fecha_nacimiento || "—"}</li>
        <li><b>Dirección:</b> ${[calle, comuna, ciudad, pais].filter(Boolean).join(", ") || "—"}</li>
        <li><b>Tipo:</b> ${tipo_solicitud || "—"}</li>
      </ul>
      <p>Estado inicial: pendiente</p>
    `;

    // Payload SendGrid v3
    const payload = {
      personalizations: [
        {
          to: [{ email: TO }],
          subject: "Nueva solicitud de acceso (GoUp)",
        },
      ],
      from: { email: FROM, name: "GoUp" },
      content: [{ type: "text/html", value: html }],
    };

    const sgResp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // SendGrid responde 202 cuando acepta el envío
    if (sgResp.status !== 202) {
      const errText = await sgResp.text().catch(() => "");
      console.error("sendgrid-role-request error:", errText || sgResp.statusText);
      res.status(500).json({ ok: false, error: "SendGrid failed", detail: errText });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("sendgrid-role-request exception:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
}
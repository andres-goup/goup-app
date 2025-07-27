// supabase/functions/new-user-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Variables de entorno (configúralas al desplegar)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_TO = Deno.env.get("MAIL_TO")!;           // tu correo destino
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!; // shared secret con el trigger

serve(async (req) => {
  // Autenticación del trigger (simple header secreto)
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });

  const { email, id } = await req.json();

  // Enviar correo vía Resend (puedes cambiar a Sendgrid/Mailgun)
  const rsp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GoUp <noreply@goup.yourdomain>",
      to: [MAIL_TO],
      subject: `Nuevo usuario registrado: ${email}`,
      html: `
        <h2>Nuevo usuario</h2>
        <p><b>Email:</b> ${email}</p>
        <p><b>ID:</b> ${id}</p>
        <p>Asigna sus roles en el panel admin.</p>
      `,
    }),
  });

  const text = await rsp.text();
  return new Response(text, { status: rsp.status });
});
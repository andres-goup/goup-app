import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  clubSchema,
  producerSchema,
  eventSchema,
  type ClubData,
  type ProducerData,
  type EventData,
} from "../src/lib/schemas";

type Body =
  | { type: "club"; payload: unknown }
  | { type: "producer"; payload: unknown }
  | { type: "event"; payload: unknown };

type ParsedResult =
  | { type: "club"; data: ClubData }
  | { type: "producer"; data: ProducerData }
  | { type: "event"; data: EventData };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as Body;

    if (!body?.type || !body?.payload) {
      return res.status(400).json({ error: "Formato inválido" });
    }

    let parsed: ParsedResult;

    switch (body.type) {
      case "club": {
        const data = clubSchema.parse(body.payload);
        parsed = { type: "club", data };
        break;
      }
      case "producer": {
        const data = producerSchema.parse(body.payload);
        parsed = { type: "producer", data };
        break;
      }
      case "event": {
        const data = eventSchema.parse(body.payload);
        parsed = { type: "event", data };
        break;
      }
      default:
        return res.status(400).json({ error: "Tipo no soportado" });
    }

    console.log("Nuevo envío:", parsed.type, parsed.data);

    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Nuevo registro (${parsed.type}):\n\`\`\`${JSON.stringify(
            parsed.data,
            null,
            2
          )}\`\`\``,
        }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validación falló", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
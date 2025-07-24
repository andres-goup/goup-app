// src/lib/schemas.ts
import { z } from "zod";

/* ---------- CLUB ---------- */
export const clubSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre del club"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  tel: z.string().optional(),
  desc: z.string().optional(),
  direccion: z.string().optional(),
  comuna: z.string().optional(),
  aforo: z.coerce.number().int().positive("Aforo inválido"),
  banos: z.coerce.number().int().nonnegative().optional(),
  amb: z.coerce.number().int().nonnegative().optional(),
  servicios: z.object({
    estacionamiento: z.boolean().optional(),
    guardarropia: z.boolean().optional(),
    terraza: z.boolean().optional(),
    accesibilidad: z.boolean().optional(),
    wifi: z.boolean().optional(),
    fumadores: z.boolean().optional(),
  }),
  img_perfil: z.any().optional(),
  img_banner: z.any().optional(),
});
export type ClubData = z.infer<typeof clubSchema>;

/* ---------- PRODUCTORA ---------- */
export const producerSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre de la productora"),
  correo: z.string().email("Email inválido"),
  tel: z.string().optional(),
  img_perfil_prod: z.any().optional(),
  img_banner_prod: z.any().optional(),
  rut: z.string().optional(),
  rs: z.string().optional(),
});
export type ProducerData = z.infer<typeof producerSchema>;

/* ---------- EVENTO ---------- */
export const eventSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre del evento"),
  tipo: z.string().min(1, "Selecciona el tipo"),
  fecha: z.string().min(1, "Requerido"),
  inicio: z.string().min(1, "Requerido"),
  fin: z.string().min(1, "Requerido"),
  edad: z.coerce.number().int().positive(),
  capacidad: z.string().min(1, "Selecciona capacidad"),
  presupuesto: z.string().optional(),
  promotor: z.string().min(2, "Ingresa el nombre del promotor"),
  telefono: z.string().min(5, "Teléfono inválido"),
  email: z.string().email("Email inválido"),
  desc: z.string().optional(),
  generos: z.array(z.string()).optional(),
  flyer: z.any().optional(),
  img_sec: z.any().optional(),
});
export type EventData = z.infer<typeof eventSchema>;
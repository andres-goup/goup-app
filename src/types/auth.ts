// src/types/auth.ts
export type Role = "admin" | "club_owner" | "productor" | "user";

export type DBUser = {
  id_usuario: string;
  auth_user_id: string | null;
  nombre: string;
  telefono: string | null;
  rut: string | null;
  direccion: string | null;
  foto: string | null;
  can_create_event: boolean;
  sexo: "masculino" | "femenino" | "otro" | "no_indica" | null;
  fecha_nac: string | null;     // date en texto
  correo: string | null;
  fecha_reg: string | null;
  rol: Role;
  created_at: string | null;
  updated_at: string | null;
};
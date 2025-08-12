// src/types/auth.ts
export type Role = "admin" | "club_owner" | "productor" | "user";

export type DBUser = {
  uid: string;
  auth_user_id: string | null;
  nombre: string;
  telefono: string | null;
  rut: string | null;
  direccion: string | null;
  photo_url: string | null;
  can_create_event: boolean;
  sexo: "masculino" | "femenino" | "otro" | "no_indica" | null;
  fecha_nac: string | null;     // date en texto
  email: string | null;
  fecha_reg: string | null;
  rol: Role;
  rol_extra?: 'user' | 'productor' | 'club_owner' | 'admin' | null;
  creado: Date;
  updated_at: string | null;
};
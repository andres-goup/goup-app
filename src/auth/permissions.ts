export type Role = "admin" | "club_owner" | "productor" | "user";

export function hasAnyRole(userRole: Role, allowed: Role[]) {
  return allowed.includes(userRole);
}
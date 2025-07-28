// Si no tienes helper, añade este:
function hasAnyRole(
    dbUser: { rol?: string | null; rol_extra?: string | null } | null | undefined,
    roles: Array<"admin" | "club_owner" | "productor" | "user">
  ) {
    if (!dbUser) return false;
    const r1 = dbUser.rol ?? null;
    const r2 = (dbUser as any).rol_extra ?? null;
    return roles.includes(r1 as any) || roles.includes(r2 as any);
  }
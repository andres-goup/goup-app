import { get, type FieldErrors } from "react-hook-form";

export function collectStepErrors(errors: FieldErrors, fields: string[]): string[] {
  const msgs: string[] = [];
  for (const f of fields) {
    const node = get(errors, f) as { message?: string } | undefined;
    if (node?.message) msgs.push(node.message);
  }
  return msgs;
}
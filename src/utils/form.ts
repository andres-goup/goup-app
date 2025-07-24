import type {
  FieldErrors,
  FieldError,
  FieldValues,
} from "react-hook-form";

type FlatErrors = Record<string, string>;

export function collectStepErrors(
  errors: FieldErrors<FieldValues>,
  fields: string[]
): string[] {
  const msgs: string[] = [];
  const flat = flattenErrors(errors);

  for (const f of fields) {
    const err = flat[f];
    if (err) msgs.push(err);
  }
  return msgs;
}

export function flattenErrors(
  obj: FieldErrors<FieldValues>,
  prefix = ""
): FlatErrors {
  const out: FlatErrors = {};

  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;

    if (isFieldError(v)) {
      if (v.message) out[key] = String(v.message);
      continue;
    }

    if (v && typeof v === "object") {
      Object.assign(out, flattenErrors(v as FieldErrors<FieldValues>, key));
    }
  }

  return out;
}

function isFieldError(value: unknown): value is FieldError {
  return typeof value === "object" && value !== null && "message" in value;
}
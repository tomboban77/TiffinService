import { parsePhoneNumberWithError } from "libphonenumber-js";

/**
 * Normalizes a phone number to E.164. Bare national numbers (e.g. a 10-digit
 * Canadian number typed with no country code) are assumed to be Canadian,
 * since the product launches in the GTA — see docs/BUILD_SPEC.md guardrail
 * "Phone numbers: store and match in E.164 exclusively. Normalize on every
 * entry point." Throws if the number can't be parsed as a valid number at
 * all; already-E.164 input round-trips unchanged.
 */
export function normalizePhoneE164(raw: string): string {
  const trimmed = raw.trim();
  const parsed = parsePhoneNumberWithError(trimmed, trimmed.startsWith("+") ? undefined : "CA");
  if (!parsed.isValid()) throw new Error(`"${raw}" doesn't look like a valid phone number`);
  return parsed.number;
}

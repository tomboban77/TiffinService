import { describe, expect, it } from "vitest";
import { normalizePhoneE164 } from "../lib/phone";

describe("normalizePhoneE164", () => {
  it("assumes Canadian for a bare 10-digit number", () => {
    expect(normalizePhoneE164("9055550102")).toBe("+19055550102");
  });

  it("accepts common human formatting", () => {
    expect(normalizePhoneE164("(905) 555-0102")).toBe("+19055550102");
    expect(normalizePhoneE164("905.555.0102")).toBe("+19055550102");
  });

  it("leaves already-E.164 numbers unchanged", () => {
    expect(normalizePhoneE164("+19055550102")).toBe("+19055550102");
  });

  it("respects an explicit non-Canadian country code", () => {
    expect(normalizePhoneE164("+442071838750")).toBe("+442071838750");
  });

  it("rejects unparseable input", () => {
    expect(() => normalizePhoneE164("not a phone number")).toThrow();
    expect(() => normalizePhoneE164("12345")).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { formatDateLabel } from "../lib/time";

describe("formatDateLabel", () => {
  it("formats as weekday, month, day for display", () => {
    expect(formatDateLabel("2026-08-11", "America/Toronto")).toBe("Tue, Aug 11");
  });

  it("respects the given timezone, not server local time", () => {
    expect(formatDateLabel("2026-08-11", "Asia/Kolkata")).toBe("Tue, Aug 11");
  });
});

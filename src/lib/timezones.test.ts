import { describe, expect, it, vi } from "vitest";
import { getAvailableTimezones } from "./timezones";

describe("getAvailableTimezones", () => {
  it("returns Intl.supportedValuesOf when available", () => {
    const spy = vi
      .spyOn(Intl, "supportedValuesOf")
      .mockReturnValue(["UTC", "Europe/Helsinki"] as unknown as string[]);

    expect(getAvailableTimezones()).toEqual(["UTC", "Europe/Helsinki"]);
    spy.mockRestore();
  });

  it("falls back to common timezones when Intl.supportedValuesOf throws", () => {
    const spy = vi.spyOn(Intl, "supportedValuesOf").mockImplementation(() => {
      throw new Error("unsupported");
    });

    const result = getAvailableTimezones();
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Europe/London");
    spy.mockRestore();
  });
});

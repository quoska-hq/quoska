import { describe, expect, it } from "vitest";
import { allocateBreakMinutes, requiredBreakMinutesForGross } from "@/types/break";

describe("automatic statutory break allocation", () => {
  it("uses the §4 ArbZG thresholds only after six and nine hours", () => {
    expect(requiredBreakMinutesForGross(360)).toBe(0);
    expect(requiredBreakMinutesForGross(361)).toBe(30);
    expect(requiredBreakMinutesForGross(540)).toBe(30);
    expect(requiredBreakMinutesForGross(541)).toBe(45);
  });

  it("adds only the missing minutes and preserves recorded pauses", () => {
    expect(allocateBreakMinutes(600, 30, true)).toEqual({
      requiredMinutes: 45,
      automaticMinutes: 15,
      totalMinutes: 45,
    });
    expect(allocateBreakMinutes(480, 40, true)).toEqual({
      requiredMinutes: 30,
      automaticMinutes: 0,
      totalMinutes: 40,
    });
  });

  it("does not change the pause when automatic allocation is disabled", () => {
    expect(allocateBreakMinutes(600, 10, false)).toEqual({
      requiredMinutes: 45,
      automaticMinutes: 0,
      totalMinutes: 10,
    });
  });
});

import { describe, expect, it } from "vitest";
import { calculateExpression } from "../lib/wlc-math-engine";

describe("WLC deterministic calculator", () => {
  it("handles precedence and parentheses", () => {
    expect(calculateExpression("2 + 3 * 4").value).toBe(14);
    expect(calculateExpression("(2 + 3) * 4").value).toBe(20);
  });
  it("supports powers, constants and common functions", () => {
    expect(calculateExpression("sqrt(144) + 2^3").value).toBe(20);
    expect(calculateExpression("sin(pi/2)").value).toBeCloseTo(1);
    expect(calculateExpression("log(100)").value).toBe(2);
  });
  it("rejects unknown tokens and non-finite results", () => {
    expect(() => calculateExpression("1+process.exit()")).toThrow();
    expect(() => calculateExpression("1/0")).toThrow();
  });
});

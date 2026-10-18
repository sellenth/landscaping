import { describe, expect, it } from "vitest";
import { formatInches, formatLength, parseLength } from "./units";

describe("parseLength", () => {
  it.each([
    ["12'", 144],
    ["12'6\"", 150],
    ["12'-6\"", 150],
    ["12' 6\"", 150],
    ["12' 6 1/2\"", 150.5],
    ["6\"", 6],
    ["1/2\"", 0.5],
    ["12ft 6in", 150],
    ["12 ft", 144],
    ["12.5", 150],
    ["12.5'", 150],
    ["-3'", -36],
    ["2yd", 72],
    ["1m", 39.37007874015748],
    ["100cm", 39.37007874015748],
    ["1000mm", 39.37007874015748],
    ["12’ 6”", 150],
  ])("parses %s", (input, expected) => {
    expect(parseLength(input)).toBeCloseTo(expected, 6);
  });

  it("reads bare numbers in the requested unit", () => {
    expect(parseLength("18", "in")).toBe(18);
    expect(parseLength("18", "ft")).toBe(216);
  });

  it.each(["", "abc", "12'x", "1/0\"", "'"])("rejects %j", (input) => {
    expect(parseLength(input)).toBeNull();
  });
});

describe("formatLength", () => {
  it.each([
    [150, "12'-6\""],
    [144, "12'"],
    [6, "6\""],
    [150.5, "12'-6½\""],
    [0.25, "¼\""],
    [-36, "-3'"],
    [143.9, "12'"],
  ])("formats %d", (inches, text) => {
    expect(formatLength(inches)).toBe(text);
  });

  it("round-trips through parseLength", () => {
    for (const v of [1, 13.5, 150.25, 1234.75]) expect(parseLength(formatLength(v))).toBeCloseTo(v, 6);
  });

  it("formats depths in inches", () => {
    expect(formatInches(3)).toBe('3"');
    expect(formatInches(4.5)).toBe('4½"');
  });
});

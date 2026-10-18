// All model lengths are stored in inches. These helpers convert between the
// stored value and what a designer types or reads ("12'-6\"", "3.5m", "18in").

export const INCHES_PER_FOOT = 12;
const INCHES_PER_METER = 39.37007874015748;
const CUBIC_INCHES_PER_CUBIC_YARD = 46656;
const SQUARE_INCHES_PER_SQUARE_FOOT = 144;

const GLYPH_VALUES: Record<string, string> = { "¼": "1/4", "½": "1/2", "¾": "3/4" };
const FRACTION = /^(\d+)\s*\/\s*(\d+)$/;

/** Parses "6", "6.5", "6 1/2" or "1/2" into a number. */
function parseNumberWithFraction(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const parts = t.split(/\s+/);
  if (parts.length === 2) {
    const whole = Number(parts[0]);
    const frac = parseNumberWithFraction(parts[1]);
    if (!Number.isFinite(whole) || frac === null) return null;
    return whole + Math.sign(whole || 1) * frac;
  }
  const f = FRACTION.exec(t);
  if (f) {
    const den = Number(f[2]);
    return den === 0 ? null : Number(f[1]) / den;
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t);
}

/**
 * Parses a typed length into inches. A bare number is read in `bareUnit`
 * (feet by default, since that's how landscape plans are dimensioned).
 *
 * Accepts: 12'  12'6"  12'-6"  12' 6 1/2"  6"  12ft  12ft 6in  12.5
 *          3m  30cm  150mm  2yd
 */
export function parseLength(input: string, bareUnit: "ft" | "in" | "m" = "ft"): number | null {
  let s = input
    .trim()
    .toLowerCase()
    .replace(/[’′]/g, "'")
    .replace(/[”″]/g, '"')
    .replace(/(\d?)\s*([¼½¾])/g, (_, whole: string, glyph: string) => `${whole || "0"} ${GLYPH_VALUES[glyph]}`);
  if (s === "") return null;
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  }

  const metric = /^(.+?)\s*(mm|cm|m)$/.exec(s);
  if (metric) {
    const n = parseNumberWithFraction(metric[1]);
    if (n === null) return null;
    const meters = metric[2] === "mm" ? n / 1000 : metric[2] === "cm" ? n / 100 : n;
    return sign * meters * INCHES_PER_METER;
  }

  const yards = /^(.+?)\s*(yd|yds|yard|yards)$/.exec(s);
  if (yards) {
    const n = parseNumberWithFraction(yards[1]);
    return n === null ? null : sign * n * 36;
  }

  // Feet and inches, e.g. 12'-6", 12ft 6in, 12' 6 1/2"
  const ftIn = /^(?:(.+?)\s*(?:'|ft|feet|foot))?\s*-?\s*(?:(.+?)\s*(?:"|in|inch|inches))?$/.exec(s);
  if (ftIn && (ftIn[1] !== undefined || ftIn[2] !== undefined)) {
    const feet = ftIn[1] !== undefined ? parseNumberWithFraction(ftIn[1]) : 0;
    const inches = ftIn[2] !== undefined ? parseNumberWithFraction(ftIn[2]) : 0;
    if (feet === null || inches === null) return null;
    return sign * (feet * INCHES_PER_FOOT + inches);
  }

  const bare = parseNumberWithFraction(s);
  if (bare === null) return null;
  const factor = bareUnit === "ft" ? INCHES_PER_FOOT : bareUnit === "m" ? INCHES_PER_METER : 1;
  return sign * bare * factor;
}

const FRACTION_GLYPHS: Record<number, string> = { 1: "¼", 2: "½", 3: "¾" };

/** Formats inches as feet-and-inches, rounded to the nearest 1/4", e.g. 12'-6½". */
export function formatLength(inches: number): string {
  if (!Number.isFinite(inches)) return "–";
  const sign = inches < 0 ? "-" : "";
  const quarters = Math.round(Math.abs(inches) * 4);
  const feet = Math.floor(quarters / 48);
  const rem = quarters - feet * 48;
  const wholeIn = Math.floor(rem / 4);
  const frac = rem % 4;
  const inchText = `${wholeIn || !frac ? wholeIn : ""}${frac ? FRACTION_GLYPHS[frac] : ""}"`;
  if (feet === 0) return `${sign}${inchText}`;
  if (wholeIn === 0 && frac === 0) return `${sign}${feet}'`;
  return `${sign}${feet}'-${inchText}`;
}

/** Formats a short length (like a paving depth) in inches only: 3", 4½". */
export function formatInches(inches: number): string {
  const quarters = Math.round(inches * 4);
  const whole = Math.floor(quarters / 4);
  const frac = quarters % 4;
  return `${whole}${frac ? FRACTION_GLYPHS[frac] : ""}"`;
}

export const toSquareFeet = (sqIn: number) => sqIn / SQUARE_INCHES_PER_SQUARE_FOOT;
export const toCubicYards = (cuIn: number) => cuIn / CUBIC_INCHES_PER_CUBIC_YARD;
export const toFeet = (inches: number) => inches / INCHES_PER_FOOT;

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const moneyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatSquareFeet = (sqIn: number) => `${numberFormat.format(toSquareFeet(sqIn))} sq ft`;
export const formatCubicYards = (cuIn: number) => `${decimalFormat.format(toCubicYards(cuIn))} cu yd`;
export const formatMoney = (n: number) => moneyFormat.format(n);
export const formatCount = (n: number) => numberFormat.format(n);

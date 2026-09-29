// Colour maths. OKLCH -> sRGB hex (gamut-clipped by chroma reduction), WCAG contrast, CIE Lab dE76, chroma.
// The metric must match the question: legibility -> contrast ratio; "are these different?" -> dE76;
// "which is quietest?" -> chroma. (anti-slop-ui/references/instrument-traps.md)

const clamp01 = (x) => Math.min(1, Math.max(0, x))

export function oklchToLinear(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)
const enc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function oklchToRgb([L, C, h]) {
  let c = C
  let lin = oklchToLinear(L, c, h)
  while (!inGamut(lin) && c > 0) { c -= 0.002; lin = oklchToLinear(L, Math.max(c, 0), h) }
  return lin.map((v) => Math.round(clamp01(enc(clamp01(v))) * 255))
}
export const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')
export const oklchHex = (t) => toHex(oklchToRgb(t))

const lin8 = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
export function luminance(rgb) { const [r, g, b] = rgb.map(lin8); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
export function toLab(rgb) {
  const [r, g, b] = rgb.map(lin8)
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  const fx = f(X), fy = f(Y), fz = f(Z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}
export const dE76 = (a, b) => { const A = toLab(a), B = toLab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) }
export const labChroma = (rgb) => { const l = toLab(rgb); return Math.hypot(l[1], l[2]) }
export const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

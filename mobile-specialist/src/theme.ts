/**
 * Цвета и отступы в духе веб-фронта (index.css + tailwind lavender).
 */
export const colors = {
  shell: "#ECE7F1",
  white: "#FFFFFF",
  black: "#000000",
  neutral50: "#fafafa",
  neutral100: "#f5f5f5",
  neutral300: "#d4d4d4",
  neutral400: "#a3a3a3",
  neutral500: "#737373",
  neutral600: "#525252",
  neutral700: "#404040",
  lavender50: "#F5F3F7",
  lavender100: "#EFEAF6",
  lavender200: "#E6E0F8",
  border: "#f5f5f5",
  emerald: "#059669",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const typography = {
  title: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.5 },
  headline: { fontSize: 20, fontWeight: "800" as const },
  body: { fontSize: 16 },
  small: { fontSize: 14 },
  caption: { fontSize: 12, fontWeight: "600" as const },
  tab: { fontSize: 10, fontWeight: "600" as const },
};

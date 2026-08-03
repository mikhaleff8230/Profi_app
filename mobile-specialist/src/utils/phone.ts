export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function normalizeRuNationalInput(value: string): string {
  const d = digitsOnly(value);
  if (d.length === 11 && (d.startsWith("8") || d.startsWith("7"))) return d.slice(1);
  return d.slice(0, 10);
}

export function isValidRuMobileInput(nationalDigits: string): boolean {
  const d = normalizeRuNationalInput(nationalDigits);
  return d.length === 10 && d[0] === "9";
}

export function toApiPhoneFromNational10(national10: string): string {
  const d = normalizeRuNationalInput(national10);
  if (d.length !== 10) return "";
  return `+7${d}`;
}

export function formatRuNationalDisplay(national10: string): string {
  const d = normalizeRuNationalInput(national10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

export function toNational10FromApi(phone: string): string {
  const d = digitsOnly(phone);
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return d.slice(1);
  if (d.length === 10) return d;
  return d.slice(-10);
}

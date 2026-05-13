/**
 * Маска телефона при вводе: Молдова +373 XX XXX XXX, Россия +7 XXX XXX XX XX.
 * В API уходит строка с + и цифрами (бэкенд сам нормализует пробелы).
 */

const MAX_DIGITS = 15;

/**
 * @param {string} input
 * @returns {string} — для форматирования: ведущий «+» опционально, дальше только цифры (до 15).
 */
export function sanitizePhoneInput(input) {
  const str = String(input ?? "");
  let hasPlus = false;
  const digits = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "+" && digits.length === 0 && !hasPlus) {
      hasPlus = true;
    } else if (/\d/.test(c)) {
      digits.push(c);
    }
  }
  let d = digits.join("").slice(0, MAX_DIGITS);
  if (!hasPlus && d.startsWith("8") && d.length >= 2 && d.length <= 11) {
    d = "7" + d.slice(1);
  }
  if (!d) return hasPlus ? "+" : "";
  return hasPlus ? `+${d}` : d;
}

/**
 * @param {string} sanitized — из sanitizePhoneInput
 */
export function formatPhoneMask(sanitized) {
  if (!sanitized) return "";
  if (sanitized === "+") return "+";
  const hasPlus = sanitized.startsWith("+");
  let d = sanitized.replace(/\D/g, "").slice(0, MAX_DIGITS);
  if (!d) return hasPlus ? "+" : "";

  if (!hasPlus && d.startsWith("8") && d.length >= 2 && d.length <= 11) {
    d = "7" + d.slice(1);
  }

  // +373 XX XXX XXX (11 цифр: 373 + 8)
  if (d.startsWith("373")) {
    const body = d.slice(0, 11);
    const rest = body.slice(3);
    let out = "+373";
    if (!rest) return out;
    out += ` ${rest.slice(0, 2)}`;
    if (rest.length <= 2) return out;
    out += ` ${rest.slice(2, 5)}`;
    if (rest.length <= 5) return out;
    out += ` ${rest.slice(5, 8)}`;
    return out;
  }

  // +7 XXX XXX XX XX (11 цифр: 7 + 10)
  if (d.startsWith("7")) {
    const body = d.slice(0, 11);
    const rest = body.slice(1);
    let out = "+7";
    if (!rest) return out;
    out += ` ${rest.slice(0, 3)}`;
    if (rest.length <= 3) return out;
    out += ` ${rest.slice(3, 6)}`;
    if (rest.length <= 6) return out;
    out += ` ${rest.slice(6, 8)}`;
    if (rest.length <= 8) return out;
    out += ` ${rest.slice(8, 10)}`;
    return out;
  }

  // Остальное: + и группы по 3 цифры после первой
  let out = `+${d[0]}`;
  for (let i = 1; i < d.length; i += 3) {
    out += ` ${d.slice(i, i + 3)}`;
  }
  return out.trim();
}

/**
 * @param {string} nextRaw — e.target.value
 */
export function applyPhoneMask(nextRaw) {
  const s = sanitizePhoneInput(nextRaw);
  return formatPhoneMask(s);
}

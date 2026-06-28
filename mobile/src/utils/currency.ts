export function formatTaskBudget(budget?: number | null): string | null {
  if (budget == null || budget <= 0) return null;
  return `от ${new Intl.NumberFormat("ru-RU").format(budget)} ₽`;
}

export function formatResponseFeeMdl(fee?: number | null): string {
  if (fee == null || fee <= 0) return "бесплатно";
  return `${fee} ₽`;
}

import type { Lang } from "../i18n";
import { translate } from "../i18n";

export function timeAgo(iso: string | undefined | null, lang: Lang): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return translate(lang, "just_now");
  if (diff < 3600) return `${Math.floor(diff / 60)} ${translate(lang, "ago_minutes")}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${translate(lang, "ago_hours")}`;
  return `${Math.floor(diff / 86400)} ${translate(lang, "ago_days")}`;
}

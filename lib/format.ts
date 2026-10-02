const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const shortDateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });
const longDateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Une date seule (YYYY-MM-DD) est interprétée en calendaire, sans décalage de fuseau. */
function parse(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
}

export const formatTime = (iso: string) => timeFmt.format(parse(iso));
export const formatShortDate = (iso: string) => shortDateFmt.format(parse(iso));
export const formatDate = (iso: string) => longDateFmt.format(parse(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(parse(iso));

export function formatDueIn(days: number): string {
  if (days < 0) return `en retard de ${-days} j`;
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} j`;
}

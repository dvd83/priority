const DAY_MS = 86_400_000;

/** Date du jour (YYYY-MM-DD) dans le fuseau donné. */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  return dateInZone(now, timeZone);
}

/** Date calendaire (YYYY-MM-DD) d'un instant dans le fuseau donné. */
export function dateInZone(instant: Date, timeZone: string): string {
  // en-CA formate en YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Nombre de jours calendaires entre deux dates YYYY-MM-DD (to - from). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / DAY_MS);
}

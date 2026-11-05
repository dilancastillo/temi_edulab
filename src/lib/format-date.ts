/** "hoy 10:32", "ayer 18:05" o "3 nov 09:15": cuándo llegó al servidor el último guardado. */
export function formatLastSaved(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const time = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (date.getTime() >= startOfToday) return `hoy ${time}`;
  if (date.getTime() >= startOfToday - dayMs) return `ayer ${time}`;
  return `${date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} ${time}`;
}

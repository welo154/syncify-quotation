export function finite(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Format money without trailing .00 for whole amounts. */
export function formatMoney(value: number, currency = "EGP"): string {
  const whole = Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-9;
  const formatted = new Intl.NumberFormat("en-EG", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(whole ? Math.round(value) : value);
  return `${formatted} ${currency}`;
}

export function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function daysLater(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function esc(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ] as string)
  );
}

export function displayItemName(sectionName: string, productName: string): string {
  const room = sectionName.trim();
  const product = productName.trim();
  if (!product) return "";
  if (!room || room.toLowerCase() === "installation") return product;
  return `${room} – ${product}`;
}

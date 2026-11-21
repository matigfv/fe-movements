/** Formats an amount with its real currency code (this app's "symbol" is the code, e.g. ARS). */
export function formatAmount(
  value: number,
  currency?: string | null,
  maximumFractionDigits = 0,
): string {
  const num = Math.abs(value).toLocaleString("es-AR", { maximumFractionDigits });
  return `${value < 0 ? "-" : ""}${currency ? `${currency} ` : ""}${num}`;
}

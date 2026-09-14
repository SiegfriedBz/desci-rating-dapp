/** Shared column headers so the skeleton and live table stay aligned. */
export const KA_TABLE_HEADERS = [
  "Title",
  "KA UAL",
  "Score",
  "R-KA UAL",
] as const;

export function truncateUal(ual: string, head = 12, tail = 8): string {
  if (ual.length <= head + tail + 1) {
    return ual;
  }
  return `${ual.slice(0, head)}…${ual.slice(-tail)}`;
}

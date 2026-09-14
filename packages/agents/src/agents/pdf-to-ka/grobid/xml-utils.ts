export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function collectText(node: unknown): string {
  if (node == null) {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join(" ");
  }
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if ("#text" in record) {
      return collectText(record["#text"]);
    }
    return Object.entries(record)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, value]) => collectText(value))
      .join(" ");
  }
  return "";
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max);
}

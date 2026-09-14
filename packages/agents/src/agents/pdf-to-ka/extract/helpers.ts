/**
 * Repository URLs land in the assertion graph as IRIs, so reject anything that
 * is not an absolute http(s) URL (the model schema can only ask for a string).
 */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

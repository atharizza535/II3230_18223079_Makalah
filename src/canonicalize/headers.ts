import type { HeaderMap } from "../types.js";

export function normalizeHeaders(headers: HeaderMap = {}, signedHeaderNames: string[] = []): {
  signedHeaders: HeaderMap;
  signedHeaderNames: string[];
} {
  const lowerHeaderMap = new Map<string, string>();
  for (const [name, value] of Object.entries(headers)) {
    lowerHeaderMap.set(name.toLowerCase(), value.trim().replace(/\s+/g, " "));
  }

  const names = [...new Set(signedHeaderNames.map((name) => name.toLowerCase()))].sort();
  const signedHeaders: HeaderMap = {};
  for (const name of names) {
    const value = lowerHeaderMap.get(name);
    if (value !== undefined) signedHeaders[name] = value;
  }

  return { signedHeaders, signedHeaderNames: Object.keys(signedHeaders).sort() };
}

export function canonicalizeSignedHeaders(headers: HeaderMap, names: string[]): string {
  return names.map((name) => `${name}:${headers[name] ?? ""}`).join("\n");
}

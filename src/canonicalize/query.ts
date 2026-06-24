function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function canonicalizeQuery(
  query?: string | URLSearchParams | Record<string, string | number | boolean | Array<string | number | boolean>>
): string {
  const pairs: Array<[string, string]> = [];

  if (!query) return "";

  if (typeof query === "string") {
    const raw = query.startsWith("?") ? query.slice(1) : query;
    new URLSearchParams(raw).forEach((value, key) => pairs.push([key, value]));
  } else if (query instanceof URLSearchParams) {
    query.forEach((value, key) => pairs.push([key, value]));
  } else {
    for (const [key, value] of Object.entries(query)) {
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) pairs.push([key, String(item)]);
    }
  }

  return pairs
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    )
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join("&");
}

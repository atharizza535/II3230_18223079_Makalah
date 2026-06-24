import { sha256Prefixed } from "../crypto/hash.js";
import type { CanonicalRequestParts, SigningRequest } from "../types.js";
import { normalizeHeaders, canonicalizeSignedHeaders } from "./headers.js";
import { canonicalizeQuery } from "./query.js";

function canonicalizePath(path: string): string {
  const pathname = path || "/";
  const withoutQuery = pathname.split("?")[0] || "/";
  return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
}

export async function canonicalizeRequest(
  request: SigningRequest,
  signedHeaderNames: string[] = []
): Promise<CanonicalRequestParts> {
  const { signedHeaders, signedHeaderNames: normalizedNames } = normalizeHeaders(request.headers, signedHeaderNames);

  return {
    method: request.method.toUpperCase(),
    canonicalPath: canonicalizePath(request.path),
    canonicalQuery: canonicalizeQuery(request.query),
    signedHeaders,
    signedHeaderNames: normalizedNames,
    bodyHash: await sha256Prefixed(request.body ?? "")
  };
}

export function buildCanonicalRequestString(parts: CanonicalRequestParts, context: {
  clientId: string;
  timestamp: number;
  timeBucket: number;
  corpusVersion: string;
  registryHash: string;
}): string {
  return [
    parts.method,
    parts.canonicalPath,
    parts.canonicalQuery,
    parts.bodyHash,
    parts.signedHeaderNames.join(";"),
    canonicalizeSignedHeaders(parts.signedHeaders, parts.signedHeaderNames),
    context.clientId,
    String(context.timestamp),
    String(context.timeBucket),
    context.corpusVersion,
    context.registryHash
  ].join("\n");
}

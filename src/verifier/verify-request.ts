import { canonicalizeRequest, buildCanonicalRequestString } from "../canonicalize/request.js";
import { computeRegistryHash } from "../corpus/registry.js";
import { derivePublicCorpusSalt } from "../corpus/fragment.js";
import { constantTimeEqual } from "../crypto/constant-time.js";
import { sha256Prefixed } from "../crypto/hash.js";
import { hmacSha256Hex } from "../crypto/hmac.js";
import { computeTimeBucket } from "../signer/sign-request.js";
import type { HeaderMap, SigningRequest, VerificationOptions, VerificationResult } from "../types.js";

function getHeader(headers: HeaderMap | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
}

export async function verifyRequest(request: SigningRequest, options: VerificationOptions): Promise<VerificationResult> {
  try {
    const clientId = getHeader(request.headers, "X-Client-Id");
    const timestampRaw = getHeader(request.headers, "X-Timestamp");
    const corpusVersion = getHeader(request.headers, "X-Corpus-Version");
    const registryHash = getHeader(request.headers, "X-Registry-Hash");
    const signature = getHeader(request.headers, "X-Signature");
    const signedHeaderNames = getHeader(request.headers, "X-Signed-Headers")?.split(";").filter(Boolean) ?? [];

    if (!clientId) return { valid: false, reason: "missing_client_id" };
    if (!timestampRaw) return { valid: false, reason: "missing_timestamp", clientId };
    if (!corpusVersion) return { valid: false, reason: "missing_corpus_version", clientId };
    if (!registryHash) return { valid: false, reason: "missing_registry_hash", clientId, corpusVersion };
    if (!signature) return { valid: false, reason: "missing_signature", clientId, corpusVersion };
    if (corpusVersion !== options.registry.version) return { valid: false, reason: "unknown_corpus_version", clientId, corpusVersion };

    const timestamp = Number(timestampRaw);
    if (!Number.isInteger(timestamp)) return { valid: false, reason: "missing_timestamp", clientId, corpusVersion };

    const now = options.now ?? Math.floor(Date.now() / 1000);
    const maxSkew = options.maxClockSkewSeconds ?? 60;
    if (Math.abs(now - timestamp) > maxSkew) return { valid: false, reason: "timestamp_expired", clientId, corpusVersion };

    const actualRegistryHash = await computeRegistryHash(options.registry);
    if (registryHash !== actualRegistryHash) return { valid: false, reason: "registry_hash_mismatch", clientId, corpusVersion };

    const secret = await options.secretResolver(clientId);
    if (!secret) return { valid: false, reason: "unknown_client", clientId, corpusVersion };

    const timeBucket = computeTimeBucket(timestamp, options.timeBucketSeconds);
    const parts = await canonicalizeRequest(request, signedHeaderNames);
    const canonicalRequest = buildCanonicalRequestString(parts, {
      clientId,
      timestamp,
      timeBucket,
      corpusVersion,
      registryHash
    });
    const salt = await derivePublicCorpusSalt(options.registry, canonicalRequest);
    const signingPayload = `${canonicalRequest}\n${salt.publicCorpusSalt}`;
    const expected = await hmacSha256Hex(secret, signingPayload);
    const canonicalRequestHash = await sha256Prefixed(canonicalRequest);

    if (!constantTimeEqual(signature, expected)) {
      return { valid: false, reason: "signature_mismatch", clientId, timeBucket, corpusVersion, canonicalRequestHash };
    }

    return { valid: true, clientId, timeBucket, corpusVersion, canonicalRequestHash };
  } catch {
    return { valid: false, reason: "invalid_request" };
  }
}

import { canonicalizeRequest, buildCanonicalRequestString } from "../canonicalize/request.js";
import { computeRegistryHash } from "../corpus/registry.js";
import { derivePublicCorpusSalt } from "../corpus/fragment.js";
import { hmacSha256Hex } from "../crypto/hmac.js";
import { sha256Prefixed } from "../crypto/hash.js";
import type { SignedHeaders, SigningDebugInfo, SigningOptions, SigningRequest } from "../types.js";

export function computeTimeBucket(timestamp: number, bucketSeconds = 30): number {
  return Math.floor(timestamp / bucketSeconds);
}

export async function createSigningArtifacts(
  request: SigningRequest,
  options: SigningOptions
): Promise<{ headers: SignedHeaders; debug: SigningDebugInfo; signingPayload: string }> {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const registryHash = await computeRegistryHash(options.registry);
  const timeBucket = computeTimeBucket(timestamp, options.timeBucketSeconds);
  const parts = await canonicalizeRequest(request, options.signedHeaderNames);
  const canonicalRequest = buildCanonicalRequestString(parts, {
    clientId: options.clientId,
    timestamp,
    timeBucket,
    corpusVersion: options.registry.version,
    registryHash
  });
  const salt = await derivePublicCorpusSalt(options.registry, canonicalRequest);
  const signingPayload = `${canonicalRequest}\n${salt.publicCorpusSalt}`;
  const signature = await hmacSha256Hex(options.secretKey, signingPayload);
  const canonicalRequestHash = await sha256Prefixed(canonicalRequest);

  const headers: SignedHeaders = {
    "X-Client-Id": options.clientId,
    "X-Timestamp": String(timestamp),
    "X-Corpus-Version": options.registry.version,
    "X-Registry-Hash": registryHash,
    "X-Signature": signature
  };

  if (parts.signedHeaderNames.length > 0) headers["X-Signed-Headers"] = parts.signedHeaderNames.join(";");
  return {
    headers,
    signingPayload,
    debug: {
      canonicalRequestHash,
      registryHash,
      timeBucket,
      corpusVersion: options.registry.version,
      salt,
      signature
    }
  };
}

export async function signRequest(request: SigningRequest, options: SigningOptions): Promise<SignedHeaders> {
  return (await createSigningArtifacts(request, options)).headers;
}

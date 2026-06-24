export type HeaderMap = Record<string, string>;

export interface SigningRequest {
  method: string;
  path: string;
  query?: string | URLSearchParams | Record<string, string | number | boolean | Array<string | number | boolean>>;
  headers?: HeaderMap;
  body?: string | Uint8Array | ArrayBuffer | null;
}

export interface CorpusEntry {
  id: string;
  license: string;
  content: string;
  snapshotHash: string;
  sourceUrl?: string;
  sourceName?: string;
}

export interface CorpusRegistry {
  version: string;
  normalization: "utf8-nfc-lf-trim";
  fragmentLength: number;
  corpora: CorpusEntry[];
}

export interface CanonicalRequestParts {
  method: string;
  canonicalPath: string;
  canonicalQuery: string;
  signedHeaders: HeaderMap;
  signedHeaderNames: string[];
  bodyHash: string;
}

export interface SigningOptions {
  clientId: string;
  secretKey: string;
  registry: CorpusRegistry;
  timestamp?: number;
  signedHeaderNames?: string[];
  timeBucketSeconds?: number;
}

export type SignedHeaders = HeaderMap & {
  "X-Client-Id": string;
  "X-Timestamp": string;
  "X-Corpus-Version": string;
  "X-Registry-Hash": string;
  "X-Signature": string;
  "X-Signed-Headers"?: string;
};

export type VerificationFailureReason =
  | "missing_client_id"
  | "missing_timestamp"
  | "missing_corpus_version"
  | "missing_registry_hash"
  | "missing_signature"
  | "unknown_client"
  | "unknown_corpus_version"
  | "registry_hash_mismatch"
  | "timestamp_expired"
  | "signature_mismatch"
  | "invalid_request";

export interface VerificationResult {
  valid: boolean;
  reason?: VerificationFailureReason;
  clientId?: string;
  timeBucket?: number;
  corpusVersion?: string;
  canonicalRequestHash?: string;
}

export interface VerificationOptions {
  registry: CorpusRegistry;
  secretResolver: (clientId: string) => string | undefined | Promise<string | undefined>;
  now?: number;
  maxClockSkewSeconds?: number;
  timeBucketSeconds?: number;
}

export interface SaltDerivationResult {
  seed: string;
  corpusId: string;
  fragmentOffset: number;
  fragmentPreview: string;
  publicCorpusSalt: string;
}

export interface SigningDebugInfo {
  canonicalRequestHash: string;
  registryHash: string;
  timeBucket: number;
  corpusVersion: string;
  salt: SaltDerivationResult;
  signature: string;
}

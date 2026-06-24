import { sha256Hex, sha256Prefixed } from "../crypto/hash.js";
import type { CorpusRegistry, SaltDerivationResult } from "../types.js";
import { normalizeRegistry } from "./registry.js";

function hexToBigInt(hex: string): bigint {
  return BigInt(`0x${hex}`);
}

function circularFragment(content: string, offset: number, length: number): string {
  if (content.length === 0) return "";
  let fragment = "";
  for (let index = 0; index < length; index += 1) {
    fragment += content[(offset + index) % content.length];
  }
  return fragment;
}

function previewFragment(fragment: string): string {
  return fragment.replace(/\s+/g, " ").slice(0, 160);
}

export async function derivePublicCorpusSalt(
  registry: CorpusRegistry,
  canonicalRequest: string
): Promise<SaltDerivationResult> {
  const normalized = normalizeRegistry(registry);
  if (normalized.corpora.length === 0) throw new Error("Corpus registry must contain at least one corpus");

  const seed = await sha256Hex(`public-corpus-seed-v1\n${canonicalRequest}`);
  const seedNumber = hexToBigInt(seed);
  const corpusIndex = Number(seedNumber % BigInt(normalized.corpora.length));
  const corpus = normalized.corpora[corpusIndex];
  const offset = corpus.content.length === 0 ? 0 : Number(seedNumber % BigInt(corpus.content.length));
  const fragment = circularFragment(corpus.content, offset, normalized.fragmentLength);
  const publicCorpusSalt = await sha256Prefixed(
    ["public-corpus-salt-v1", normalized.version, corpus.id, corpus.snapshotHash, fragment].join("\n")
  );

  return {
    seed: `sha256:${seed}`,
    corpusId: corpus.id,
    fragmentOffset: offset,
    fragmentPreview: previewFragment(fragment),
    publicCorpusSalt
  };
}

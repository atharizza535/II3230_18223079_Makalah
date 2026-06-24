import { sha256Prefixed } from "../crypto/hash.js";
import type { CorpusRegistry } from "../types.js";
import { normalizeCorpusText } from "./normalize.js";

const normalizedRegistryCache = new WeakMap<CorpusRegistry, CorpusRegistry>();
const registryHashCache = new WeakMap<CorpusRegistry, string>();

export function normalizeRegistry(registry: CorpusRegistry): CorpusRegistry {
  const cached = normalizedRegistryCache.get(registry);
  if (cached) return cached;

  const normalized = {
    ...registry,
    corpora: registry.corpora.map((entry) => ({
      ...entry,
      content: normalizeCorpusText(entry.content)
    }))
  };
  normalizedRegistryCache.set(registry, normalized);
  return normalized;
}

export async function computeRegistryHash(registry: CorpusRegistry): Promise<string> {
  const cached = registryHashCache.get(registry);
  if (cached) return cached;

  const normalized = normalizeRegistry(registry);
  const payload = JSON.stringify({
    version: normalized.version,
    normalization: normalized.normalization,
    fragmentLength: normalized.fragmentLength,
    corpora: normalized.corpora.map(({ id, license, snapshotHash }) => ({ id, license, snapshotHash }))
  });
  const hash = await sha256Prefixed(payload);
  registryHashCache.set(registry, hash);
  return hash;
}

export async function validateRegistrySnapshots(registry: CorpusRegistry): Promise<void> {
  for (const entry of normalizeRegistry(registry).corpora) {
    const actual = await sha256Prefixed(entry.content);
    if (actual !== entry.snapshotHash) {
      throw new Error(`Snapshot hash mismatch for corpus ${entry.id}: expected ${entry.snapshotHash}, got ${actual}`);
    }
  }
}

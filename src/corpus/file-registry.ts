import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CorpusRegistry } from "../types.js";

interface RegistryFileEntry {
  id: string;
  license: string;
  path: string;
  snapshotHash: string;
  sourceUrl?: string;
  sourceName?: string;
}

interface RegistryFile {
  version: string;
  normalization: "utf8-nfc-lf-trim";
  fragmentLength: number;
  corpora: RegistryFileEntry[];
}

export function loadCorpusRegistry(registryPath = "corpus/registry.json"): CorpusRegistry {
  const absoluteRegistryPath = resolve(registryPath);
  const registry = JSON.parse(readFileSync(absoluteRegistryPath, "utf8")) as RegistryFile;

  return {
    version: registry.version,
    normalization: registry.normalization,
    fragmentLength: registry.fragmentLength,
    corpora: registry.corpora.map((entry) => ({
      id: entry.id,
      license: entry.license,
      snapshotHash: entry.snapshotHash,
      sourceUrl: entry.sourceUrl,
      sourceName: entry.sourceName,
      content: readFileSync(resolve(entry.path), "utf8")
    }))
  };
}

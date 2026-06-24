import { describe, expect, it } from "vitest";
import { buildCanonicalRequestString, canonicalizeRequest, computeRegistryHash, computeTimeBucket, demoRegistry, derivePublicCorpusSalt } from "../src/index.js";
import { baseRequest, clientId, fixedTimestamp } from "./helpers.js";

describe("public corpus salt derivation", () => {
  it("is deterministic for the same canonical request", async () => {
    const registryHash = await computeRegistryHash(demoRegistry);
    const parts = await canonicalizeRequest(baseRequest, ["content-type"]);
    const canonical = buildCanonicalRequestString(parts, {
      clientId,
      timestamp: fixedTimestamp,
      timeBucket: computeTimeBucket(fixedTimestamp),
      corpusVersion: demoRegistry.version,
      registryHash
    });

    const first = await derivePublicCorpusSalt(demoRegistry, canonical);
    const second = await derivePublicCorpusSalt(demoRegistry, canonical);

    expect(first).toEqual(second);
    expect(first.publicCorpusSalt).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("changes when the time bucket changes", async () => {
    const registryHash = await computeRegistryHash(demoRegistry);
    const parts = await canonicalizeRequest(baseRequest, ["content-type"]);
    const firstCanonical = buildCanonicalRequestString(parts, {
      clientId,
      timestamp: fixedTimestamp,
      timeBucket: computeTimeBucket(fixedTimestamp),
      corpusVersion: demoRegistry.version,
      registryHash
    });
    const secondCanonical = buildCanonicalRequestString(parts, {
      clientId,
      timestamp: fixedTimestamp + 30,
      timeBucket: computeTimeBucket(fixedTimestamp + 30),
      corpusVersion: demoRegistry.version,
      registryHash
    });

    await expect(derivePublicCorpusSalt(demoRegistry, firstCanonical)).resolves.not.toEqual(
      await derivePublicCorpusSalt(demoRegistry, secondCanonical)
    );
  });
});

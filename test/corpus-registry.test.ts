import { describe, expect, it } from "vitest";
import { computeRegistryHash, demoRegistry, normalizeCorpusText, validateRegistrySnapshots } from "../src/index.js";
import sources from "../corpus/sources.json" with { type: "json" };

describe("corpus registry", () => {
  it("normalizes corpus text predictably", () => {
    expect(normalizeCorpusText("\uFEFFhello\r\nworld\r\n")).toBe("hello\nworld");
  });

  it("computes a stable registry hash", async () => {
    await expect(validateRegistrySnapshots(demoRegistry)).resolves.toBeUndefined();
    await expect(computeRegistryHash(demoRegistry)).resolves.toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("tracks provenance for every real corpus snapshot", () => {
    for (const entry of demoRegistry.corpora) {
      const source = sources.sources.find((item) => item.id === entry.id);
      expect(source?.sourceUrl).toMatch(/^https:\/\//);
      expect(source?.normalizedSnapshotHash).toBe(entry.snapshotHash);
      expect(entry.license).not.toContain("demo-placeholder");
    }
  });

  it("detects changed corpus content", async () => {
    const tampered = {
      ...demoRegistry,
      corpora: [{ ...demoRegistry.corpora[0], content: `${demoRegistry.corpora[0].content}\ntampered` }]
    };

    await expect(validateRegistrySnapshots(tampered)).rejects.toThrow(/Snapshot hash mismatch/);
  });
});

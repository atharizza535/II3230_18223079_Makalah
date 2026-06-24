import { describe, expect, it } from "vitest";
import { buildCanonicalRequestString, canonicalizeRequest, computeRegistryHash, computeTimeBucket, demoRegistry, derivePublicCorpusSalt, hmacSha256Hex, sha256Prefixed, signRequest } from "../src/index.js";
import { baseRequest, clientId, fixedTimestamp, secretKey } from "./helpers.js";

describe("test vectors", () => {
  it("produces a stable vector for valid-post-echo-v1", async () => {
    const registryHash = await computeRegistryHash(demoRegistry);
    const signedHeaders = await signRequest(baseRequest, {
      clientId,
      secretKey,
      registry: demoRegistry,
      timestamp: fixedTimestamp,
      signedHeaderNames: ["content-type"]
    });
    const parts = await canonicalizeRequest(baseRequest, ["content-type"]);
    const canonical = buildCanonicalRequestString(parts, {
      clientId,
      timestamp: fixedTimestamp,
      timeBucket: computeTimeBucket(fixedTimestamp),
      corpusVersion: demoRegistry.version,
      registryHash
    });
    const salt = await derivePublicCorpusSalt(demoRegistry, canonical);
    const signingPayloadHash = await sha256Prefixed(`${canonical}\n${salt.publicCorpusSalt}`);
    const expectedSignature = await hmacSha256Hex(secretKey, `${canonical}\n${salt.publicCorpusSalt}`);

    expect({
      name: "valid-post-echo-v1",
      bodyHash: parts.bodyHash,
      timeBucket: computeTimeBucket(fixedTimestamp),
      registryHash,
      corpusId: salt.corpusId,
      fragmentOffset: salt.fragmentOffset,
      publicCorpusSalt: salt.publicCorpusSalt,
      signingPayloadHash,
      signature: signedHeaders["X-Signature"]
    }).toEqual({
      name: "valid-post-echo-v1",
      bodyHash: "sha256:770ec658d458156b05fb32fe2c78f785375be1169d48799f3de590c1b9d06b8b",
      timeBucket: 59351520,
      registryHash: "sha256:54af62d20904e9b61846bec0a8f127bdb5d7e09083926fd604bddfbf5793abe0",
      corpusId: "gutenberg-alice-11",
      fragmentOffset: 154962,
      publicCorpusSalt: "sha256:a5094a8e27c1d7e3dcd246ecc9c99b4cfb090989815d88931cb5846e8e01a236",
      signingPayloadHash: "sha256:d4001575ef5fa492788c6e49ba74498e5edda9c34f288c3ba66e80a7926ed8ff",
      signature: expectedSignature
    });
  });
});

import { describe, expect, it } from "vitest";
import { computeRegistryHash, demoRegistry, verifyRequest } from "../src/index.js";
import { clientId, fixedTimestamp, secretKey, signedBaseRequest } from "./helpers.js";

describe("request verification", () => {
  it("accepts a valid signed request", async () => {
    const result = await verifyRequest(await signedBaseRequest(), {
      registry: demoRegistry,
      secretResolver: (id) => (id === clientId ? secretKey : undefined),
      now: fixedTimestamp
    });

    expect(result.valid).toBe(true);
    expect(result.canonicalRequestHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("rejects a modified body", async () => {
    const request = await signedBaseRequest();
    const result = await verifyRequest({ ...request, body: JSON.stringify({ message: "tampered" }) }, {
      registry: demoRegistry,
      secretResolver: (id) => (id === clientId ? secretKey : undefined),
      now: fixedTimestamp
    });

    expect(result).toMatchObject({ valid: false, reason: "signature_mismatch" });
  });

  it("rejects a modified path", async () => {
    const result = await verifyRequest({ ...(await signedBaseRequest()), path: "/api/transfer-demo" }, {
      registry: demoRegistry,
      secretResolver: (id) => (id === clientId ? secretKey : undefined),
      now: fixedTimestamp
    });

    expect(result).toMatchObject({ valid: false, reason: "signature_mismatch" });
  });

  it("rejects expired timestamps", async () => {
    const result = await verifyRequest(await signedBaseRequest(), {
      registry: demoRegistry,
      secretResolver: (id) => (id === clientId ? secretKey : undefined),
      now: fixedTimestamp + 120,
      maxClockSkewSeconds: 60
    });

    expect(result).toMatchObject({ valid: false, reason: "timestamp_expired" });
  });

  it("rejects unknown clients", async () => {
    const request = await signedBaseRequest();
    const result = await verifyRequest(request, {
      registry: demoRegistry,
      secretResolver: () => undefined,
      now: fixedTimestamp
    });

    expect(result).toMatchObject({ valid: false, reason: "unknown_client" });
  });

  it("rejects registry hash mismatch", async () => {
    const request = await signedBaseRequest();
    request.headers = { ...request.headers, "X-Registry-Hash": `${await computeRegistryHash(demoRegistry)}-wrong` };

    const result = await verifyRequest(request, {
      registry: demoRegistry,
      secretResolver: (id) => (id === clientId ? secretKey : undefined),
      now: fixedTimestamp
    });

    expect(result).toMatchObject({ valid: false, reason: "registry_hash_mismatch" });
  });
});

import { describe, expect, it } from "vitest";
import { demoRegistry, verifyRequest } from "../src/index.js";
import { clientId, fixedTimestamp, secretKey, signedBaseRequest } from "./helpers.js";

describe("replay behavior", () => {
  it("keeps same-window replay valid in a stateless verifier", async () => {
    const request = await signedBaseRequest();
    const options = {
      registry: demoRegistry,
      secretResolver: (id: string) => (id === clientId ? secretKey : undefined),
      now: fixedTimestamp + 10
    };

    await expect(verifyRequest(request, options)).resolves.toMatchObject({ valid: true });
    await expect(verifyRequest(request, options)).resolves.toMatchObject({ valid: true });
  });

  it("rejects replay after the accepted window expires", async () => {
    await expect(
      verifyRequest(await signedBaseRequest(), {
        registry: demoRegistry,
        secretResolver: (id) => (id === clientId ? secretKey : undefined),
        now: fixedTimestamp + 90,
        maxClockSkewSeconds: 60
      })
    ).resolves.toMatchObject({ valid: false, reason: "timestamp_expired" });
  });
});

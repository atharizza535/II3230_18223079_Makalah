import { demoRegistry, signRequest, verifyRequest, type SigningRequest } from "../src/index.js";

const request: SigningRequest = {
  method: "POST",
  path: "/api/echo",
  body: JSON.stringify({ message: "benchmark" })
};

const clientId = "demo-client";
const secretKey = "demo-secret-do-not-use-in-production";
const timestamp = 1780545600;
const headers = await signRequest(request, { clientId, secretKey, registry: demoRegistry, timestamp });
const signedRequest = { ...request, headers };

for (const iterations of [100, 1_000, 10_000]) {
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    const result = await verifyRequest(signedRequest, {
      registry: demoRegistry,
      secretResolver: (id) => (id === clientId ? secretKey : undefined),
      now: timestamp
    });
    if (!result.valid) throw new Error(`Unexpected verification failure: ${result.reason}`);
  }
  const elapsed = performance.now() - start;
  console.log(`${iterations} verifications: ${elapsed.toFixed(2)}ms total, ${(elapsed / iterations).toFixed(4)}ms each`);
}

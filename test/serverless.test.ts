import { describe, expect, it } from "vitest";
import { createApp, demoRegistry, signRequest, type SigningRequest } from "../src/index.js";
import { clientId, fixedTimestamp, secretKey } from "./helpers.js";

describe("Hono serverless demo", () => {
  it("accepts a valid signed echo request", async () => {
    const app = createApp();
    const body = JSON.stringify({ message: "hello" });
    const signingRequest: SigningRequest = { method: "POST", path: "/api/echo", body };
    const signedHeaders = await signRequest(signingRequest, { clientId, secretKey, registry: demoRegistry, timestamp: Math.floor(Date.now() / 1000) });

    const response = await app.request("/api/echo", {
      method: "POST",
      headers: { ...signedHeaders, "content-type": "application/json" },
      body
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, body: { message: "hello" } });
  });

  it("rejects invalid requests before business logic", async () => {
    const app = createApp();
    const response = await app.request("/api/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "unsigned" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request_signature" });
  });
});

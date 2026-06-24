import { describe, expect, it } from "vitest";
import { createApp } from "../src/index.js";

async function signTransfer(app: ReturnType<typeof createApp>) {
  const response = await app.request("/api/lab/sign-transfer", { method: "POST" });
  expect(response.status).toBe(200);
  return response.json();
}

async function attack(app: ReturnType<typeof createApp>, scenario: string, mode: "stateless" | "idempotency", signedTransfer: unknown) {
  const response = await app.request("/api/lab/attack", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario, mode, signedTransfer })
  });
  expect(response.status).toBe(200);
  return response.json();
}

describe("visual replay lab APIs", () => {
  it("serves the lab UI", async () => {
    const response = await createApp().request("/");
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("Replay Attack Lab");
  });

  it("returns safe corpus derivation data when signing a transfer", async () => {
    const signed = await signTransfer(createApp());
    expect(signed.debug.salt.corpusId).toBeTruthy();
    expect(signed.debug.salt.fragmentOffset).toBeGreaterThanOrEqual(0);
    expect(signed.debug.salt.fragmentPreview.length).toBeGreaterThan(0);
    expect(signed.debug.salt.publicCorpusSalt).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("accepts normal transfer and blocks tampered fields", async () => {
    const app = createApp();
    const signed = await signTransfer(app);

    await expect(attack(app, "send_normally", "stateless", signed)).resolves.toMatchObject({ decision: "accepted" });
    await expect(attack(app, "tamper_amount", "stateless", signed)).resolves.toMatchObject({ decision: "blocked" });
    await expect(attack(app, "tamper_recipient", "stateless", signed)).resolves.toMatchObject({ decision: "blocked" });
  });

  it("shows replay behavior difference between stateless and idempotency modes", async () => {
    const statelessApp = createApp();
    const statelessSigned = await signTransfer(statelessApp);
    await expect(attack(statelessApp, "send_normally", "stateless", statelessSigned)).resolves.toMatchObject({ decision: "accepted" });
    await expect(attack(statelessApp, "replay_immediately", "stateless", statelessSigned)).resolves.toMatchObject({ decision: "accepted" });

    const statefulApp = createApp();
    const statefulSigned = await signTransfer(statefulApp);
    await expect(attack(statefulApp, "send_normally", "idempotency", statefulSigned)).resolves.toMatchObject({ decision: "accepted" });
    await expect(attack(statefulApp, "replay_immediately", "idempotency", statefulSigned)).resolves.toMatchObject({
      decision: "blocked",
      replayStatus: "duplicate"
    });
  });

  it("blocks expired replay and wrong registry hash", async () => {
    const app = createApp();
    const signed = await signTransfer(app);

    await expect(attack(app, "replay_after_expiry", "stateless", signed)).resolves.toMatchObject({ decision: "blocked" });
    await expect(attack(app, "wrong_registry_hash", "stateless", signed)).resolves.toMatchObject({ decision: "blocked" });
  });
});

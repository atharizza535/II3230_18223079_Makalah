import { createSigningArtifacts, sha256Prefixed, verifyRequest, type HeaderMap, type SigningRequest } from "../index.js";
import type { CorpusRegistry, SigningDebugInfo, VerificationResult } from "../types.js";
import { IdempotencyStore } from "./idempotency-store.js";

export const demoClientId = "demo-client";
export const demoClientSecret = "demo-secret-do-not-use-in-production";

export type AttackScenario =
  | "send_normally"
  | "tamper_amount"
  | "tamper_recipient"
  | "replay_immediately"
  | "replay_after_expiry"
  | "wrong_registry_hash";

export type DefenseMode = "stateless" | "idempotency";

export interface SignedTransferPackage {
  request: SigningRequest;
  headers: HeaderMap;
  debug: SigningDebugInfo;
}

const idempotencyStore = new IdempotencyStore(60);

export function defaultTransfer() {
  return {
    from: demoClientId,
    to: "vendor-pertamina-demo",
    amount: 150000,
    note: "registration payment",
    requestIntent: "demo-transfer"
  };
}

export async function signTransfer(registry: CorpusRegistry, transfer = defaultTransfer()): Promise<SignedTransferPackage> {
  idempotencyStore.clear();
  const body = JSON.stringify(transfer);
  const request: SigningRequest = { method: "POST", path: "/api/transfer-demo", body };
  const artifacts = await createSigningArtifacts(request, {
    clientId: demoClientId,
    secretKey: demoClientSecret,
    registry,
    timestamp: Math.floor(Date.now() / 1000)
  });

  return {
    request,
    headers: artifacts.headers,
    debug: artifacts.debug
  };
}

function mutatePackage(input: SignedTransferPackage, scenario: AttackScenario): SignedTransferPackage {
  const originalBody = JSON.parse(String(input.request.body ?? "{}")) as Record<string, unknown>;
  const headers = { ...input.headers };
  let body = originalBody;

  if (scenario === "tamper_amount") body = { ...originalBody, amount: 999999 };
  if (scenario === "tamper_recipient") body = { ...originalBody, to: "attacker-controlled-account" };
  if (scenario === "wrong_registry_hash") headers["X-Registry-Hash"] = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

  return {
    ...input,
    headers,
    request: {
      ...input.request,
      headers,
      body: JSON.stringify(body)
    }
  };
}

async function explainServerDerivation(registry: CorpusRegistry, request: SigningRequest): Promise<SigningDebugInfo> {
  return (
    await createSigningArtifacts(request, {
      clientId: request.headers?.["X-Client-Id"] ?? demoClientId,
      secretKey: demoClientSecret,
      registry,
      timestamp: Number(request.headers?.["X-Timestamp"] ?? Math.floor(Date.now() / 1000))
    })
  ).debug;
}

export async function runAttackScenario(options: {
  registry: CorpusRegistry;
  signedTransfer: SignedTransferPackage;
  scenario: AttackScenario;
  mode: DefenseMode;
}): Promise<{
  scenario: AttackScenario;
  mode: DefenseMode;
  mutatedRequest: SigningRequest;
  clientDebug: SigningDebugInfo;
  serverDebug: SigningDebugInfo;
  verification: VerificationResult;
  replayStatus: "not_checked" | "fresh" | "duplicate";
  decision: "accepted" | "blocked";
  explanation: string;
}> {
  const mutated = mutatePackage(options.signedTransfer, options.scenario);
  const timestamp = Number(mutated.headers["X-Timestamp"]);
  const now = options.scenario === "replay_after_expiry" ? timestamp + 120 : Math.floor(Date.now() / 1000);
  const verification = await verifyRequest(mutated.request, {
    registry: options.registry,
    secretResolver: (clientId) => (clientId === demoClientId ? demoClientSecret : undefined),
    now,
    maxClockSkewSeconds: 60
  });
  const serverDebug = await explainServerDerivation(options.registry, mutated.request);
  let replayStatus: "not_checked" | "fresh" | "duplicate" = "not_checked";
  let accepted = verification.valid;

  if (verification.valid && options.mode === "idempotency") {
    const fingerprint = await sha256Prefixed(`${verification.clientId}:${verification.canonicalRequestHash}:${mutated.headers["X-Signature"]}`);
    replayStatus = idempotencyStore.checkAndStore(fingerprint, now);
    if (replayStatus === "duplicate") accepted = false;
  }

  const explanation = explainDecision(options.scenario, options.mode, verification, replayStatus, accepted);

  return {
    scenario: options.scenario,
    mode: options.mode,
    mutatedRequest: mutated.request,
    clientDebug: options.signedTransfer.debug,
    serverDebug,
    verification,
    replayStatus,
    decision: accepted ? "accepted" : "blocked",
    explanation
  };
}

function explainDecision(
  scenario: AttackScenario,
  mode: DefenseMode,
  verification: VerificationResult,
  replayStatus: "not_checked" | "fresh" | "duplicate",
  accepted: boolean
): string {
  if (accepted && scenario === "replay_immediately" && mode === "stateless") {
    return "Accepted with warning: the signature is still valid in the same time window, and stateless mode stores no duplicate fingerprint.";
  }
  if (!accepted && replayStatus === "duplicate") return "Blocked by idempotency mode: this signed request fingerprint was already seen.";
  if (!verification.valid) return `Blocked by verifier: ${verification.reason}.`;
  return "Accepted: timestamp, registry hash, corpus-derived salt, and HMAC all matched.";
}

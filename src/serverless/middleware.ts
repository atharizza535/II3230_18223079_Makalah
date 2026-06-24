import type { Context, MiddlewareHandler } from "hono";
import type { CorpusRegistry, HeaderMap, SigningRequest, VerificationOptions } from "../types.js";
import { verifyRequest } from "../verifier/verify-request.js";

async function honoToSigningRequest(context: Context): Promise<SigningRequest> {
  const url = new URL(context.req.url);
  const headers: HeaderMap = {};
  context.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = context.req.method === "GET" || context.req.method === "HEAD" ? "" : await context.req.text();
  return {
    method: context.req.method,
    path: url.pathname,
    query: url.search,
    headers,
    body
  };
}

export function replayProtectionMiddleware(options: {
  registry: CorpusRegistry;
  secretResolver: VerificationOptions["secretResolver"];
  clock?: () => number;
  maxClockSkewSeconds?: number;
  timeBucketSeconds?: number;
}): MiddlewareHandler {
  return async (context, next) => {
    const signingRequest = await honoToSigningRequest(context);
    const result = await verifyRequest(signingRequest, {
      registry: options.registry,
      secretResolver: options.secretResolver,
      now: options.clock?.(),
      maxClockSkewSeconds: options.maxClockSkewSeconds,
      timeBucketSeconds: options.timeBucketSeconds
    });

    if (!result.valid) {
      context.header("X-Replay-Protection-Result", result.reason ?? "invalid_request");
      return context.json({ error: "invalid_request_signature" }, 401);
    }

    context.set("verification", result);
    await next();
  };
}

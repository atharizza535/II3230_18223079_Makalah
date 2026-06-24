import { Hono } from "hono";
import { demoRegistry } from "../corpus/demo-registry.js";
import { runAttackScenario, signTransfer, type AttackScenario, type DefenseMode, type SignedTransferPackage } from "./lab.js";
import { renderLabPage } from "./lab-page.js";
import { replayProtectionMiddleware } from "./middleware.js";

const demoClientId = "demo-client";
const demoClientSecret = "demo-secret-do-not-use-in-production";

export function createApp() {
  const app = new Hono();

  app.get("/", (context) => {
    return context.html(renderLabPage());
  });

  app.get("/api/time", (context) => {
    return context.json({ now: Math.floor(Date.now() / 1000), corpusVersion: demoRegistry.version });
  });

  app.post("/api/lab/sign-transfer", async (context) => {
    const body = await context.req.json().catch(() => undefined);
    return context.json(await signTransfer(demoRegistry, body?.transfer));
  });

  app.post("/api/lab/attack", async (context) => {
    const body = (await context.req.json()) as {
      scenario: AttackScenario;
      mode: DefenseMode;
      signedTransfer: SignedTransferPackage;
    };
    return context.json(
      await runAttackScenario({
        registry: demoRegistry,
        scenario: body.scenario,
        mode: body.mode,
        signedTransfer: body.signedTransfer
      })
    );
  });

  app.use(
    "/api/*",
    replayProtectionMiddleware({
      registry: demoRegistry,
      secretResolver: (clientId) => (clientId === demoClientId ? demoClientSecret : undefined)
    })
  );

  app.post("/api/echo", async (context) => {
    return context.json({ ok: true, body: await context.req.json().catch(() => null) });
  });

  app.post("/api/transfer-demo", async (context) => {
    const body = await context.req.json().catch(() => ({}));
    return context.json({
      ok: true,
      warning: "This endpoint intentionally demonstrates that same-window replay still reaches business logic in a stateless verifier.",
      accepted: body
    });
  });

  return app;
}

export default createApp();

import { demoRegistry, signRequest } from "../src/index.js";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://localhost:8787";
const clientId = process.env.DEMO_CLIENT_ID ?? "demo-client";
const secretKey = process.env.DEMO_CLIENT_SECRET ?? "demo-secret-do-not-use-in-production";

async function sendSigned(body: string, path = "/api/echo") {
  const request = { method: "POST", path, body };
  const headers = await signRequest(request, {
    clientId,
    secretKey,
    registry: demoRegistry,
    timestamp: Math.floor(Date.now() / 1000)
  });

  return {
    headers,
    response: await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body
    })
  };
}

const body = JSON.stringify({ message: "signed request valid" });
const valid = await sendSigned(body);
console.log("valid signed request:", valid.response.status, await valid.response.text());

const tampered = await fetch(`${baseUrl}/api/echo`, {
  method: "POST",
  headers: { ...valid.headers, "content-type": "application/json" },
  body: JSON.stringify({ message: "tampered after signing" })
});
console.log("tampered body:", tampered.status, await tampered.text());

const replay = await fetch(`${baseUrl}/api/echo`, {
  method: "POST",
  headers: { ...valid.headers, "content-type": "application/json" },
  body
});
console.log("same-window replay:", replay.status, await replay.text());

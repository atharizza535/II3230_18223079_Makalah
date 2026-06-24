import { demoRegistry, signRequest, type SigningRequest } from "../src/index.js";

export const clientId = "demo-client";
export const secretKey = "demo-secret-do-not-use-in-production";
export const fixedTimestamp = 1780545600;

export const baseRequest: SigningRequest = {
  method: "POST",
  path: "/api/echo",
  query: "b=2&a=1",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({ message: "uji replay" })
};

export async function signedBaseRequest() {
  const signedHeaders = await signRequest(baseRequest, {
    clientId,
    secretKey,
    registry: demoRegistry,
    timestamp: fixedTimestamp,
    signedHeaderNames: ["content-type"]
  });
  return {
    ...baseRequest,
    headers: {
      ...baseRequest.headers,
      ...signedHeaders
    }
  };
}

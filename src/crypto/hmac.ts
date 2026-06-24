import { bytesToHex, toArrayBuffer } from "./hash.js";

export async function hmacSha256Hex(secretKey: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, toArrayBuffer(payload));
  return bytesToHex(new Uint8Array(signature));
}

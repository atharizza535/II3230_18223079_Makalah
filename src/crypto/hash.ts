const encoder = new TextEncoder();

export function toBytes(input: string | Uint8Array | ArrayBuffer | null | undefined): Uint8Array {
  if (input == null) return new Uint8Array();
  if (typeof input === "string") return encoder.encode(input);
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

export function toArrayBuffer(input: string | Uint8Array | ArrayBuffer | null | undefined): ArrayBuffer {
  const bytes = toBytes(input);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(input: string | Uint8Array | ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(input));
  return bytesToHex(new Uint8Array(digest));
}

export async function sha256Prefixed(input: string | Uint8Array | ArrayBuffer): Promise<string> {
  return `sha256:${await sha256Hex(input)}`;
}

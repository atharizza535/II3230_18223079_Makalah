import { describe, expect, it } from "vitest";
import { canonicalizeQuery, canonicalizeRequest } from "../src/index.js";

describe("canonicalization", () => {
  it("sorts query parameters by key then value", () => {
    expect(canonicalizeQuery("b=2&a=2&a=1")).toBe("a=1&a=2&b=2");
  });

  it("normalizes method, signed headers, and body hash deterministically", async () => {
    const first = await canonicalizeRequest(
      {
        method: "post",
        path: "api/echo",
        headers: { "Content-Type": " application/json  " },
        body: "{\"ok\":true}"
      },
      ["content-type"]
    );
    const second = await canonicalizeRequest(
      {
        method: "POST",
        path: "/api/echo",
        headers: { "content-type": "application/json" },
        body: "{\"ok\":true}"
      },
      ["Content-Type"]
    );

    expect(first).toEqual(second);
    expect(first.method).toBe("POST");
    expect(first.canonicalPath).toBe("/api/echo");
    expect(first.signedHeaders["content-type"]).toBe("application/json");
    expect(first.bodyHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

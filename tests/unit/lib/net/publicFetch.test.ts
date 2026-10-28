import { describe, it, expect } from "vitest";
import {
  isPublicAddress,
  assertPublicHttpUrl,
  readTextWithLimit,
  UnsafeUrlError,
} from "@/lib/net/publicFetch";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "64:ff9b::7f00:1",
  ])("rejects %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"])("allows %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  it("rejects strings that are not IP addresses", () => {
    expect(isPublicAddress("localhost")).toBe(false);
  });
});

describe("assertPublicHttpUrl", () => {
  it("rejects non-http protocols", async () => {
    await expect(assertPublicHttpUrl(new URL("file:///etc/passwd"))).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicHttpUrl(new URL("ftp://8.8.8.8/x"))).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects literal private and metadata addresses", async () => {
    await expect(assertPublicHttpUrl(new URL("http://127.0.0.1:3000/api"))).rejects.toThrow(/private or reserved/);
    await expect(assertPublicHttpUrl(new URL("http://169.254.169.254/latest/meta-data"))).rejects.toThrow(
      /private or reserved/
    );
    await expect(assertPublicHttpUrl(new URL("http://[::1]/"))).rejects.toThrow(/private or reserved/);
  });

  it("rejects hostnames that resolve to loopback", async () => {
    await expect(assertPublicHttpUrl(new URL("http://localhost/"))).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects embedded credentials", async () => {
    await expect(assertPublicHttpUrl(new URL("http://user:pass@8.8.8.8/"))).rejects.toThrow(/credentials/);
  });

  it("accepts a public literal address", async () => {
    await expect(assertPublicHttpUrl(new URL("https://8.8.8.8/"))).resolves.toBeUndefined();
  });
});

describe("readTextWithLimit", () => {
  it("returns the body when under the limit", async () => {
    await expect(readTextWithLimit(new Response("hello"), 10)).resolves.toBe("hello");
  });

  it("aborts once the body exceeds the limit", async () => {
    await expect(readTextWithLimit(new Response("x".repeat(100)), 10)).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});

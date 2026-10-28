/**
 * SSRF-safe fetching for user-supplied URLs.
 *
 * Every hop (the initial URL and each redirect target) must be http(s) and must
 * resolve only to public addresses: loopback, private, link-local (including
 * the cloud metadata endpoint 169.254.169.254), CGNAT, multicast, reserved and
 * IPv4-mapped/NAT64 IPv6 ranges are refused.
 *
 * Limitation: the address is checked at lookup time and the socket resolves it
 * again, so a DNS-rebinding attacker with a very short TTL could still race the
 * check. Pair this with network egress rules for defence in depth.
 */

import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

// Separate lists: a single BlockList also matches IPv4 addresses against IPv6
// rules (as IPv4-mapped), so the ::ffff:0:0/96 rule would block all of IPv4.
const blockedV4 = new BlockList();
const blockedV6 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedV4.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96], // IPv4-mapped
  ["64:ff9b::", 96], // NAT64
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blockedV6.addSubnet(network, prefix, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedV4.check(address, "ipv4");
  if (family === 6) return !blockedV6.check(address, "ipv6");
  return false;
}

/** Throws `UnsafeUrlError` unless the URL is http(s) and resolves only to public addresses. */
export async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only HTTP/HTTPS URLs are supported");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with embedded credentials are not allowed");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true, verbatim: true }).catch(() => [])).map((a) => a.address);

  if (addresses.length === 0) {
    throw new UnsafeUrlError(`Could not resolve host "${url.hostname}"`);
  }
  if (!addresses.every(isPublicAddress)) {
    throw new UnsafeUrlError("URL resolves to a private or reserved network address");
  }
}

/**
 * `fetch` for untrusted URLs: validates the target, then follows up to
 * `maxRedirects` redirects manually so each hop is validated too.
 */
export async function fetchPublicUrl(
  input: string,
  init: Omit<RequestInit, "redirect"> = {},
  maxRedirects = 5
): Promise<Response> {
  let url = new URL(input);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHttpUrl(url);
    const res = await fetch(url, { ...init, redirect: "manual" });

    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;

    await res.body?.cancel();
    url = new URL(location, url);
  }

  throw new UnsafeUrlError(`Too many redirects (more than ${maxRedirects})`);
}

/** Reads a response body as text, aborting once it exceeds `maxBytes`. */
export async function readTextWithLimit(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel();
    throw new UnsafeUrlError(`Response too large (${declared} bytes, max ${maxBytes})`);
  }
  if (!res.body) return "";

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new UnsafeUrlError(`Response too large (max ${maxBytes} bytes)`);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

import "server-only";

/**
 * Simple in-memory sliding-window limiter to slow down brute-force login.
 * Note: state is per-instance (not shared across multiple Render instances).
 * For a single-instance deployment this is sufficient; scale-out would need
 * a shared store (Redis). Documented in README.
 */

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Login limiter combining two ceilings:
 *  - per-IP (8 / 10 min) — normal abuse protection.
 *  - global (40 / 10 min) — backstop against an attacker rotating/spoofing
 *    X-Forwarded-For to dodge the per-IP limit.
 * Returns the stricter result.
 */
export function loginRateLimit(ip: string) {
  const perIp = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000);
  const global = rateLimit("login:__global__", 40, 10 * 60 * 1000);
  if (!perIp.ok) return perIp;
  if (!global.ok) return global;
  return perIp;
}

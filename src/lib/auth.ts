import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "mr_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short (set a long random value)");
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type Session = { sub: string; username: string };

export async function createSession(username: string): Promise<void> {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    // Pin the algorithm — reject any token not signed with HS256.
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return { sub: String(payload.sub), username: String(payload.username) };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Guard for API route handlers. Returns the session or throws a 401 Response. */
export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s) {
    throw new Response(JSON.stringify({ error: "Не авторизован" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return s;
}

function forbid(msg: string): never {
  throw new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * CSRF protection for state-changing requests. Defense in depth on top of the
 * SameSite=Lax session cookie:
 *  1. Honor Sec-Fetch-Site — reject cross-site / same-site requests.
 *  2. Require a valid Origin or Referer whose host matches the request Host.
 *  Requests that can't be verified are rejected (fail closed).
 */
export function assertSameOrigin(req: Request): void {
  const host = req.headers.get("host");
  if (!host) forbid("Нет заголовка Host");

  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "same-origin" && sfs !== "none") {
    forbid("Запрос с чужого источника");
  }

  const source = req.headers.get("origin") || req.headers.get("referer");
  if (!source) forbid("Не удалось проверить источник запроса");

  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    forbid("Некорректный источник");
  }
  if (sourceHost !== host) forbid("Запрос с чужого источника");
}

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

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { sub: String(payload.sub), username: String(payload.username) };
  } catch {
    return null;
  }
}

export function destroySession(): void {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
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

/**
 * Basic CSRF mitigation for state-changing requests: since auth uses a
 * SameSite=Lax cookie, also verify the Origin matches the Host for
 * non-GET requests.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin navigations may omit Origin
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      throw new Response(JSON.stringify({ error: "Запрос с чужого источника" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  } catch {
    throw new Response(JSON.stringify({ error: "Некорректный источник" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
}

import { NextResponse } from "next/server";
import { getAdminByUsername } from "@/lib/db";
import { verifyPassword, createSession, assertSameOrigin } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { loginRateLimit, clientIp } from "@/lib/rateLimit";
import { readJsonLimited } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A VALID 60-char cost-12 bcrypt hash (of a throwaway string). Used when the
// username doesn't exist so the compare performs the same key-derivation work
// as a real login (~260ms) — a malformed hash short-circuits in ~0ms and leaks,
// via response timing, whether a username exists. Must stay at cost 12 to match
// real admin hashes (see scripts/seed.mjs).
const DUMMY_HASH = "$2a$12$wh8bSCT2Dq0Mp3aOcBs.GeDoBzgbVFx2ZWluKjqIlPE5nvRHtOuqS";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    const ip = clientIp(req);
    const rl = loginRateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Слишком много попыток. Повторите через ${rl.retryAfter} с.` },
        { status: 429, headers: { "cache-control": "no-store" } }
      );
    }

    const body = await readJsonLimited(req, 4 * 1024);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }

    const admin = await getAdminByUsername(parsed.data.username);
    // Always run a real bcrypt compare (even for unknown users) to equalize
    // timing and prevent username enumeration.
    const hash = admin?.password_hash ?? DUMMY_HASH;
    const ok = await verifyPassword(parsed.data.password, hash);

    if (!admin || !ok) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    await createSession(admin.username);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

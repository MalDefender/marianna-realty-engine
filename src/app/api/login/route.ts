import { NextResponse } from "next/server";
import { getAdminByUsername } from "@/lib/db";
import { verifyPassword, createSession, assertSameOrigin } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { loginRateLimit, clientIp } from "@/lib/rateLimit";
import { readJsonLimited } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // Always run a compare to reduce username-enumeration timing signal.
    const hash = admin?.password_hash ?? "$2a$12$0000000000000000000000000000000000000000000000000000";
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

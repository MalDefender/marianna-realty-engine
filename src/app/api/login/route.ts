import { NextResponse } from "next/server";
import { getAdminByUsername } from "@/lib/db";
import { verifyPassword, createSession, assertSameOrigin } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    const ip = clientIp(req);
    const rl = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Слишком много попыток. Повторите через ${rl.retryAfter} с.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
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

import { NextResponse } from "next/server";
import { getListing, updateListing, deleteListing } from "@/lib/db";
import { requireAdmin, assertSameOrigin } from "@/lib/auth";
import { listingSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const item = await getListing(params.id);
    if (!item) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = listingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Проверьте поля", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const ok = await updateListing(params.id, parsed.data);
    if (!ok) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const ok = await deleteListing(params.id);
    if (!ok) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getListing, updateListing, deleteListing } from "@/lib/db";
import { requireAdmin, assertSameOrigin } from "@/lib/auth";
import { listingSchema } from "@/lib/validation";
import { readJsonLimited } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const item = await getListing(id);
    if (!item) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { id } = await params;
    const body = await readJsonLimited(req);
    const parsed = listingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Проверьте поля", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const ok = await updateListing(id, parsed.data);
    if (!ok) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { id } = await params;
    const ok = await deleteListing(id);
    if (!ok) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

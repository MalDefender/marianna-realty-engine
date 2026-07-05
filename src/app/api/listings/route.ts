import { NextResponse } from "next/server";
import { listListings, createListing } from "@/lib/db";
import { requireAdmin, assertSameOrigin } from "@/lib/auth";
import { listingSchema } from "@/lib/validation";
import { readJsonLimited } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List (admin sees all; guard ensures auth)
export async function GET() {
  try {
    await requireAdmin();
    const items = await listListings();
    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// Create
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = await readJsonLimited(req);
    const parsed = listingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Проверьте поля", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const id = await createListing(parsed.data);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

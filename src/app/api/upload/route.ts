import { NextResponse } from "next/server";
import { saveImage } from "@/lib/db";
import { requireAdmin, assertSameOrigin } from "@/lib/auth";
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Magic-byte signatures — don't trust the client-declared MIME alone.
function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Файл больше 6 МБ" }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMime(buf);
    if (!sniffed || !ALLOWED_IMAGE_MIME.includes(sniffed as (typeof ALLOWED_IMAGE_MIME)[number])) {
      return NextResponse.json({ error: "Только JPEG, PNG или WebP" }, { status: 415 });
    }

    const id = await saveImage(sniffed, buf.toString("base64"));
    return NextResponse.json({ ok: true, id, url: `/api/image/${id}` }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

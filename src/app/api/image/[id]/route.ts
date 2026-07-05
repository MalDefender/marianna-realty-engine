import { getImage } from "@/lib/db";

export const runtime = "nodejs";

// Public image delivery. IDs are UUIDs (validated) → no path traversal.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) {
    return new Response("Not found", { status: 404 });
  }
  const img = await getImage(params.id);
  if (!img) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(img.data, "base64");
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.length),
    },
  });
}

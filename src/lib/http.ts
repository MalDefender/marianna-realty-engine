import "server-only";

/**
 * Read and JSON-parse a request body with a hard size cap.
 * Prevents memory-exhaustion DoS from oversized payloads.
 * Throws a Response on violation (handled by the route's catch).
 */
export async function readJsonLimited(req: Request, maxBytes = 100 * 1024): Promise<unknown> {
  const len = req.headers.get("content-length");
  if (len && Number(len) > maxBytes) {
    throw jsonError("Слишком большой запрос", 413);
  }
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw jsonError("Слишком большой запрос", 413);
  }
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw jsonError("Некорректный JSON", 400);
  }
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

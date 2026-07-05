import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Storage layer with two interchangeable backends:
 *  - Postgres (when DATABASE_URL is set) — for production (Render/Neon).
 *  - Local JSON file (data/db.json) — for development only.
 *
 * All queries are parameterized (no string interpolation) → SQL-injection safe.
 */

export type Listing = {
  id: string;
  type: string;
  title: string;
  price: number;
  location: string;
  rooms: string;
  area: string;
  floor: string;
  land: string;
  description: string;
  photos: string[];
  published: boolean;
  sort: number;
  created_at: string;
};

export type Admin = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

export type StoredImage = { id: string; mime: string; data: string; created_at: string };

const usePg = !!process.env.DATABASE_URL;
const DATA_DIR = path.join(process.cwd(), "data");
const JSON_PATH = path.join(DATA_DIR, "db.json");

type JsonShape = { admins: Admin[]; listings: Listing[]; images: StoredImage[] };

// ---------- Postgres backend ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pool: any = null;
async function pool() {
  if (_pool) return _pool;
  const { Pool } = await import("pg");
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 5,
  });
  return _pool;
}

// ---------- JSON backend ----------
let _jsonCache: JsonShape | null = null;
let _writeChain: Promise<void> = Promise.resolve();

async function readJson(): Promise<JsonShape> {
  if (_jsonCache) return _jsonCache;
  try {
    const raw = await fs.readFile(JSON_PATH, "utf8");
    _jsonCache = JSON.parse(raw);
  } catch {
    _jsonCache = { admins: [], listings: [], images: [] };
  }
  return _jsonCache!;
}

async function writeJson(data: JsonShape): Promise<void> {
  _jsonCache = data;
  // serialize writes; write to temp then atomic rename
  _writeChain = _writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = JSON_PATH + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, JSON_PATH);
  });
  return _writeChain;
}

// ---------- Schema init ----------
let _initPromise: Promise<void> | null = null;

// Memoized so schema creation runs once per process, not on every request.
export function initDb(): Promise<void> {
  if (!_initPromise) {
    _initPromise = doInit().catch((e) => {
      _initPromise = null; // allow retry on failure
      throw e;
    });
  }
  return _initPromise;
}

async function doInit(): Promise<void> {
  if (usePg) {
    const p = await pool();
    await p.query(`CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await p.query(`CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL,
      price BIGINT NOT NULL DEFAULT 0, location TEXT NOT NULL DEFAULT '',
      rooms TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '',
      floor TEXT NOT NULL DEFAULT '', land TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '', photos JSONB NOT NULL DEFAULT '[]',
      published BOOLEAN NOT NULL DEFAULT true, sort INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await p.query(`CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  } else {
    await readJson();
  }
}

function rowToListing(r: Record<string, unknown>): Listing {
  return {
    id: String(r.id),
    type: String(r.type),
    title: String(r.title),
    price: Number(r.price),
    location: String(r.location),
    rooms: String(r.rooms),
    area: String(r.area),
    floor: String(r.floor),
    land: String(r.land),
    description: String(r.description),
    photos: Array.isArray(r.photos) ? (r.photos as string[]) : JSON.parse(String(r.photos || "[]")),
    published: Boolean(r.published),
    sort: Number(r.sort),
    created_at: String(r.created_at),
  };
}

// ---------- Admins ----------
export async function countAdmins(): Promise<number> {
  if (usePg) {
    const p = await pool();
    const { rows } = await p.query("SELECT COUNT(*)::int AS c FROM admins");
    return rows[0].c;
  }
  return (await readJson()).admins.length;
}

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  if (usePg) {
    const p = await pool();
    const { rows } = await p.query("SELECT * FROM admins WHERE username = $1 LIMIT 1", [username]);
    return rows[0] ?? null;
  }
  const db = await readJson();
  return db.admins.find((a) => a.username === username) ?? null;
}

export async function createAdmin(username: string, passwordHash: string): Promise<void> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  if (usePg) {
    const p = await pool();
    await p.query(
      "INSERT INTO admins (id, username, password_hash, created_at) VALUES ($1,$2,$3,$4)",
      [id, username, passwordHash, created_at]
    );
    return;
  }
  const db = await readJson();
  db.admins.push({ id, username, password_hash: passwordHash, created_at });
  await writeJson(db);
}

// ---------- Listings ----------
export async function listListings(opts: { publishedOnly?: boolean } = {}): Promise<Listing[]> {
  if (usePg) {
    const p = await pool();
    const where = opts.publishedOnly ? "WHERE published = true" : "";
    const { rows } = await p.query(
      `SELECT * FROM listings ${where} ORDER BY sort ASC, price DESC, created_at DESC`
    );
    return rows.map(rowToListing);
  }
  const db = await readJson();
  let items = [...db.listings];
  if (opts.publishedOnly) items = items.filter((l) => l.published);
  items.sort((a, b) => a.sort - b.sort || b.price - a.price);
  return items;
}

export async function getListing(id: string): Promise<Listing | null> {
  if (usePg) {
    const p = await pool();
    const { rows } = await p.query("SELECT * FROM listings WHERE id = $1 LIMIT 1", [id]);
    return rows[0] ? rowToListing(rows[0]) : null;
  }
  const db = await readJson();
  return db.listings.find((l) => l.id === id) ?? null;
}

export type ListingInput = Omit<Listing, "id" | "created_at">;

export async function createListing(input: ListingInput): Promise<string> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  if (usePg) {
    const p = await pool();
    await p.query(
      `INSERT INTO listings (id,type,title,price,location,rooms,area,floor,land,description,photos,published,sort,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, input.type, input.title, input.price, input.location, input.rooms, input.area,
       input.floor, input.land, input.description, JSON.stringify(input.photos),
       input.published, input.sort, created_at]
    );
    return id;
  }
  const db = await readJson();
  db.listings.push({ id, created_at, ...input });
  await writeJson(db);
  return id;
}

export async function updateListing(id: string, input: ListingInput): Promise<boolean> {
  if (usePg) {
    const p = await pool();
    const { rowCount } = await p.query(
      `UPDATE listings SET type=$2,title=$3,price=$4,location=$5,rooms=$6,area=$7,floor=$8,
       land=$9,description=$10,photos=$11,published=$12,sort=$13 WHERE id=$1`,
      [id, input.type, input.title, input.price, input.location, input.rooms, input.area,
       input.floor, input.land, input.description, JSON.stringify(input.photos),
       input.published, input.sort]
    );
    return (rowCount ?? 0) > 0;
  }
  const db = await readJson();
  const idx = db.listings.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  db.listings[idx] = { ...db.listings[idx], ...input, id, created_at: db.listings[idx].created_at };
  await writeJson(db);
  return true;
}

export async function deleteListing(id: string): Promise<boolean> {
  if (usePg) {
    const p = await pool();
    const { rowCount } = await p.query("DELETE FROM listings WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
  const db = await readJson();
  const before = db.listings.length;
  db.listings = db.listings.filter((l) => l.id !== id);
  await writeJson(db);
  return db.listings.length < before;
}

// ---------- Images ----------
export async function saveImage(mime: string, base64: string): Promise<string> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  if (usePg) {
    const p = await pool();
    await p.query("INSERT INTO images (id, mime, data, created_at) VALUES ($1,$2,$3,$4)", [
      id, mime, base64, created_at,
    ]);
    return id;
  }
  const db = await readJson();
  db.images.push({ id, mime, data: base64, created_at });
  await writeJson(db);
  return id;
}

export async function getImage(id: string): Promise<StoredImage | null> {
  if (usePg) {
    const p = await pool();
    const { rows } = await p.query("SELECT * FROM images WHERE id = $1 LIMIT 1", [id]);
    return rows[0] ?? null;
  }
  const db = await readJson();
  return db.images.find((i) => i.id === id) ?? null;
}

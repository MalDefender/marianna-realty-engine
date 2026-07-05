// Self-contained seed script (no TS imports). Run: npm run seed
// Creates the admin from ADMIN_USERNAME/ADMIN_PASSWORD and seeds real listings.
// Idempotent: won't duplicate an existing admin or re-seed non-empty listings.

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

// --- tiny .env loader ---
async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env file — rely on real env */
  }
}

const now = () => new Date().toISOString();

const LISTINGS = [
  ["Квартира", "3-комнатная, 250 м²", 280000000, "Геленджик · побережье", "3", "250", "12/16", ""],
  ["Дом", "Дом 316 м² с участком", 250000000, "Геленджик", "", "316", "", "5,9 сот"],
  ["Дом", "Дом 288 м² у моря", 155000000, "Дивноморское", "", "288", "", "26,1 сот"],
  ["Апартаменты", "Апартаменты 98 м²", 90000000, "Геленджик", "2", "98,3", "2/5", ""],
  ["Квартира", "2-комнатная, 110 м²", 68000000, "Геленджик", "2", "110,4", "11/12", ""],
  ["Апартаменты", "Апартаменты 92 м²", 57000000, "Геленджик", "2", "92", "1/5", ""],
  ["Квартира", "2-комнатная, 106 м²", 46350000, "Геленджик", "2", "106", "3/12", ""],
  ["Квартира", "2-комнатная, 72 м²", 26700000, "Геленджик", "2", "72", "7/10", ""],
  ["Квартира", "1-комнатная, 56,9 м²", 24500000, "Геленджик", "1", "56,9", "8/20", ""],
  ["Апартаменты", "Апартаменты 50,9 м²", 22000000, "Геленджик", "1", "50,9", "8/8", ""],
  ["Апартаменты", "Апартаменты 60,7 м²", 20500000, "Геленджик", "2", "60,7", "1/8", ""],
].map((r, i) => ({
  id: crypto.randomUUID(),
  type: r[0], title: r[1], price: r[2], location: r[3],
  rooms: r[4], area: r[5], floor: r[6], land: r[7],
  description: "", photos: [], published: true, sort: i, created_at: now(),
}));

async function seedJson(adminUser, adminHash) {
  const DATA_DIR = path.join(process.cwd(), "data");
  const JSON_PATH = path.join(DATA_DIR, "db.json");
  await fs.mkdir(DATA_DIR, { recursive: true });
  let db = { admins: [], listings: [], images: [] };
  try { db = JSON.parse(await fs.readFile(JSON_PATH, "utf8")); } catch {}
  if (!db.admins.some((a) => a.username === adminUser)) {
    db.admins.push({ id: crypto.randomUUID(), username: adminUser, password_hash: adminHash, created_at: now() });
    console.log(`  ✓ админ "${adminUser}" создан`);
  } else console.log(`  • админ "${adminUser}" уже существует — пропуск`);
  if (db.listings.length === 0) {
    db.listings = LISTINGS;
    console.log(`  ✓ добавлено объектов: ${LISTINGS.length}`);
  } else console.log(`  • объекты уже есть (${db.listings.length}) — пропуск`);
  await fs.writeFile(JSON_PATH, JSON.stringify(db, null, 2), "utf8");
}

async function seedPg(adminUser, adminHash) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL,
    price BIGINT NOT NULL DEFAULT 0, location TEXT NOT NULL DEFAULT '', rooms TEXT NOT NULL DEFAULT '',
    area TEXT NOT NULL DEFAULT '', floor TEXT NOT NULL DEFAULT '', land TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', photos JSONB NOT NULL DEFAULT '[]', published BOOLEAN NOT NULL DEFAULT true,
    sort INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);

  const a = await pool.query("SELECT 1 FROM admins WHERE username=$1", [adminUser]);
  if (a.rowCount === 0) {
    await pool.query("INSERT INTO admins (id,username,password_hash) VALUES ($1,$2,$3)",
      [crypto.randomUUID(), adminUser, adminHash]);
    console.log(`  ✓ админ "${adminUser}" создан`);
  } else console.log(`  • админ "${adminUser}" уже существует — пропуск`);

  const c = await pool.query("SELECT COUNT(*)::int AS c FROM listings");
  if (c.rows[0].c === 0) {
    for (const l of LISTINGS) {
      await pool.query(
        `INSERT INTO listings (id,type,title,price,location,rooms,area,floor,land,description,photos,published,sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [l.id, l.type, l.title, l.price, l.location, l.rooms, l.area, l.floor, l.land, l.description,
         JSON.stringify(l.photos), l.published, l.sort]);
    }
    console.log(`  ✓ добавлено объектов: ${LISTINGS.length}`);
  } else console.log(`  • объекты уже есть (${c.rows[0].c}) — пропуск`);
  await pool.end();
}

async function main() {
  await loadEnv();
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) {
    console.error("✗ Задай ADMIN_USERNAME и ADMIN_PASSWORD в .env"); process.exit(1);
  }
  if (adminPass.length < 8) {
    console.error("✗ ADMIN_PASSWORD слишком короткий (мин. 8 символов)"); process.exit(1);
  }
  const hash = await bcrypt.hash(adminPass, 12);
  console.log(process.env.DATABASE_URL ? "Сид в Postgres…" : "Сид в локальный JSON (data/db.json)…");
  if (process.env.DATABASE_URL) await seedPg(adminUser, hash);
  else await seedJson(adminUser, hash);
  console.log("Готово.");
}

main().catch((e) => { console.error(e); process.exit(1); });

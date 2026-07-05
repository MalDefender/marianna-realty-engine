"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Listing } from "@/lib/db";

const TYPES = ["Квартира", "Апартаменты", "Дом"];

type FormState = {
  type: string;
  title: string;
  price: string;
  location: string;
  rooms: string;
  area: string;
  floor: string;
  land: string;
  description: string;
  photos: string[];
  published: boolean;
  sort: string;
};

function fromListing(l?: Listing): FormState {
  return {
    type: l?.type ?? "Квартира",
    title: l?.title ?? "",
    price: l ? String(l.price) : "",
    location: l?.location ?? "Геленджик",
    rooms: l?.rooms ?? "",
    area: l?.area ?? "",
    floor: l?.floor ?? "",
    land: l?.land ?? "",
    description: l?.description ?? "",
    photos: l?.photos ?? [],
    published: l?.published ?? true,
    sort: l ? String(l.sort) : "0",
  };
}

export default function ListingForm({ initial, id }: { initial?: Listing; id?: string }) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(fromListing(initial));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function up<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function changeType(type: string) {
    setF((prev) => ({
      ...prev,
      type,
      // участок — только у дома; этаж — только у квартиры/апартаментов
      land: type === "Дом" ? prev.land : "",
      floor: type === "Дом" ? "" : prev.floor,
    }));
  }

  const isHouse = f.type === "Дом";

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErr("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error || "Не удалось загрузить фото");
          break;
        }
        setF((prev) => ({ ...prev, photos: [...prev.photos, data.id] }));
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(pid: string) {
    setF((prev) => ({ ...prev, photos: prev.photos.filter((p) => p !== pid) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const payload = {
      type: f.type,
      title: f.title,
      price: Number(f.price) || 0,
      location: f.location,
      rooms: f.rooms,
      area: f.area,
      floor: f.floor,
      land: f.land,
      description: f.description,
      photos: f.photos,
      published: f.published,
      sort: Number(f.sort) || 0,
    };
    const res = await fetch(id ? `/api/listings/${id}` : "/api/listings", {
      method: id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Проверьте поля формы");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="form-grid two">
        <div className="field">
          <label>Тип</label>
          <select value={f.type} onChange={(e) => changeType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Цена, ₽</label>
          <input inputMode="numeric" value={f.price}
            onChange={(e) => up("price", e.target.value.replace(/[^\d]/g, ""))} placeholder="20500000" />
        </div>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Заголовок</label>
        <input value={f.title} onChange={(e) => up("title", e.target.value)}
          placeholder="Апартаменты 60,7 м²" required />
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Локация</label>
        <input value={f.location} onChange={(e) => up("location", e.target.value)}
          placeholder="Геленджик · побережье" />
      </div>

      <div className="form-grid two" style={{ marginTop: 16 }}>
        <div className="field">
          <label>Комнат</label>
          <input value={f.rooms} onChange={(e) => up("rooms", e.target.value)} placeholder="2" />
        </div>
        <div className="field">
          <label>Площадь, м²</label>
          <input value={f.area} onChange={(e) => up("area", e.target.value)} placeholder="60,7" />
        </div>
        {isHouse ? (
          <div className="field">
            <label>Участок</label>
            <input value={f.land} onChange={(e) => up("land", e.target.value)} placeholder="5,9 сот" />
          </div>
        ) : (
          <div className="field">
            <label>Этаж</label>
            <input value={f.floor} onChange={(e) => up("floor", e.target.value)} placeholder="1/8" />
          </div>
        )}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Описание</label>
        <textarea value={f.description} onChange={(e) => up("description", e.target.value)}
          placeholder="Свободный текст об объекте (необязательно)" />
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Фотографии (JPEG/PNG/WebP, до 6 МБ)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onUpload} />
        {uploading && <div className="ok">Загрузка…</div>}
        <div className="thumbs">
          {f.photos.map((p) => (
            <div className="th" key={p}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/image/${p}`} alt="" />
              <button type="button" onClick={() => removePhoto(p)} aria-label="Удалить фото">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-grid two" style={{ marginTop: 16 }}>
        <div className="field">
          <label>Порядок (меньше = выше)</label>
          <input inputMode="numeric" value={f.sort}
            onChange={(e) => up("sort", e.target.value.replace(/[^\d]/g, ""))} />
        </div>
        <div className="field">
          <label>Видимость</label>
          <label className="check" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={f.published}
              onChange={(e) => up("published", e.target.checked)} />
            Показывать на сайте
          </label>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
        <button className="btn" type="submit" disabled={busy || uploading}>
          {busy ? "Сохранение…" : id ? "Сохранить" : "Создать объект"}
        </button>
        <a className="btn ghost" href="/admin">
          Отмена
        </a>
      </div>
    </form>
  );
}

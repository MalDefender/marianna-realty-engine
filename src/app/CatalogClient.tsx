"use client";

import { useEffect, useState } from "react";
import type { Listing } from "@/lib/db";
import { formatPrice, specLine } from "@/lib/format";

const FILTERS = ["Все", "Квартира", "Апартаменты", "Дом"] as const;

export default function CatalogClient({
  listings,
  contact,
}: {
  listings: Listing[];
  contact: string;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Все");
  const [active, setActive] = useState<Listing | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  const items = listings.filter((l) => filter === "Все" || l.type === filter);

  return (
    <>
      <div className="filter" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 26 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn sm ghost"
            style={
              filter === f
                ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                : undefined
            }
          >
            {f}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty">Пока нет объектов в этой категории.</div>
      ) : (
        <div className="catalog">
          {items.map((l) => (
            <button key={l.id} className="obj" onClick={() => setActive(l)}>
              <div className="img">
                {l.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/image/${l.photos[0]}`} alt={l.title} loading="lazy" />
                ) : null}
                <span className="tag">{l.type}</span>
              </div>
              <div className="body">
                <div className="price">
                  {formatPrice(l.price)} <span className="cur">₽</span>
                </div>
                <h3>{l.title}</h3>
                <div className="addr">↳ {l.location}</div>
                <div className="specs">
                  {specLine(l).map((s, i) => (
                    <div className="s" key={i}>
                      <b>{s.value}</b> {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}>
          <div className="backdrop" onClick={() => setActive(null)} />
          <div className="card">
            <button className="close" onClick={() => setActive(null)} aria-label="Закрыть">
              ✕
            </button>
            <div className="mimg">
              {active.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/image/${active.photos[0]}`} alt={active.title} />
              ) : null}
              <span className="tag">{active.type}</span>
            </div>
            <div className="mbody">
              <div className="mprice">{formatPrice(active.price)} ₽</div>
              <div className="mtitle">{active.title}</div>
              <div className="maddr">↳ {active.location}</div>
              <div className="mspecs">
                {specLine(active).map((s, i) => (
                  <div className="s" key={i}>
                    <b>{s.value}</b> {s.label}
                  </div>
                ))}
              </div>
              {active.description ? (
                <p className="mdesc">{active.description}</p>
              ) : (
                <p className="mdesc muted">
                  Подробности и фотографии — по запросу. Нажмите «Узнать об объекте».
                </p>
              )}
              <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn" href={contact} target="_blank" rel="noopener">
                  Узнать об объекте
                </a>
                <button className="btn ghost" onClick={() => setActive(null)}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

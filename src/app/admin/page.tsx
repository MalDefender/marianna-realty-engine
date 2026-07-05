import { listListings, initDb } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { AdminHeader } from "./AdminShell";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await initDb();
  const items = await listListings();

  return (
    <div className="admin-shell">
      <AdminHeader />
      <div className="admin-main">
        <div className="toolbar">
          <h1>Объекты ({items.length})</h1>
          <a className="btn" href="/admin/new">
            + Добавить объект
          </a>
        </div>

        {items.length === 0 ? (
          <div className="card">Пока нет объектов. Нажмите «Добавить объект».</div>
        ) : (
          <div className="row-list">
            {items.map((l) => (
              <div className="lrow" key={l.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.photos[0] ? (
                  <img className="th" src={`/api/image/${l.photos[0]}`} alt="" />
                ) : (
                  <div className="th" />
                )}
                <div>
                  <div className="t">
                    {l.title}
                    {!l.published && <span className="badge-off">скрыт</span>}
                  </div>
                  <div className="sub">
                    {l.type} · {l.location} · {formatPrice(l.price)} ₽
                  </div>
                </div>
                <div className="acts">
                  <a className="btn sm ghost" href={`/admin/edit/${l.id}`}>
                    Редактировать
                  </a>
                  <DeleteButton id={l.id} title={l.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

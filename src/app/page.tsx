import { listListings, initDb } from "@/lib/db";
import CatalogClient from "./CatalogClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await initDb();
  const listings = await listListings({ publishedOnly: true });
  const contact = process.env.NEXT_PUBLIC_CONTACT_URL || "https://www.instagram.com/marianna_realty/";

  return (
    <>
      <nav className="site">
        <div className="wrap nav-inner">
          <div className="logo">
            <span className="m">Марианна Антонова</span>
            <span className="s">Геленджик</span>
          </div>
          <a className="btn sm" href={contact} target="_blank" rel="noopener">
            Связаться
          </a>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap">
          <div className="eyeline">Эксперт по недвижимости · Геленджик и побережье</div>
          <h1 style={{ marginTop: 18 }}>
            Недвижимость
            <br />у моря <em>без потерь</em>.
          </h1>
          <p>
            Квартиры, апартаменты и дома в Геленджике и на побережье — от 20 млн до
            премиум-класса. Подбор, юридическая проверка и сопровождение сделки.
          </p>
          <div className="stats">
            <div>
              <div className="k">{listings.length}</div>
              <div className="v">объектов в продаже</div>
            </div>
            <div>
              <div className="k">Геленджик</div>
              <div className="v">и Дивноморское</div>
            </div>
            <div>
              <div className="k">100%</div>
              <div className="v">юр. проверка</div>
            </div>
          </div>
        </div>
      </header>

      <main className="section" id="catalog">
        <div className="wrap">
          <div className="sec-head">
            <h2>
              Объекты
              <br />в продаже
            </h2>
            <p>Листайте объекты и открывайте любой — цена, площадь и детали внутри.</p>
          </div>
          <CatalogClient listings={listings} contact={contact} />
        </div>
      </main>

      <footer className="site">
        <div className="wrap foot-inner">
          <div>© {new Date().getFullYear()} Марианна Антонова · Недвижимость Геленджика</div>
          <div>Сделано на движке @Fernandness</div>
        </div>
      </footer>
    </>
  );
}

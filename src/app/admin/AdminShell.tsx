"use client";

import { useRouter } from "next/navigation";

export function AdminHeader() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }
  return (
    <div className="admin-top">
      <div className="wrap in">
        <div className="admin-brand">
          Панель · <span>Марианна</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn sm ghost" href="/" target="_blank" rel="noopener">
            Сайт ↗
          </a>
          <button className="btn sm ghost" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}

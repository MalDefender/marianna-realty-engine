"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Ошибка входа");
        setLoading(false);
        return;
      }
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setErr("Сеть недоступна");
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <h1>Вход в панель</h1>
      <p>Управление каталогом объектов</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="u">Логин</label>
          <input id="u" value={username} onChange={(e) => setUsername(e.target.value)}
            autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="p">Пароль</label>
          <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Входим…" : "Войти"}
        </button>
        {err && <div className="err">{err}</div>}
      </div>
    </form>
  );
}

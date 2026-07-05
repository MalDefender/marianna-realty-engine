"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm(`Удалить объект «${title}»? Это действие необратимо.`)) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      alert("Не удалось удалить");
      setBusy(false);
    }
  }

  return (
    <button className="btn sm danger" onClick={del} disabled={busy}>
      {busy ? "…" : "Удалить"}
    </button>
  );
}

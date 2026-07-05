import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <Suspense fallback={<div className="login-card">Загрузка…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("Credenciales inválidas");
    else router.push("/admin/pedidos");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-xl p-6 bg-surface shadow-sm">
        <h1 className="text-xl font-bold">Acceso admin</h1>
        {error && <p className="text-danger text-sm">{error}</p>}
        <input className="w-full border rounded-lg p-3 bg-surface placeholder:text-muted" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded-lg p-3 bg-surface placeholder:text-muted" type="password" placeholder="Contraseña"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-accent text-accent-fg rounded-lg p-3 font-semibold hover:bg-accent-hover transition-colors">Entrar</button>
      </form>
    </div>
  );
}

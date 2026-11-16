"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border bg-white p-2 text-black";

// Aba "Conta": o dono troca a própria senha sem depender de e-mail.
export default function Conta() {
  const [supabase] = useState(() => createClient());
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repete, setRepete] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    if (nova.length < 8) {
      setMsg("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (nova !== repete) {
      setMsg("A confirmação não confere com a nova senha.");
      return;
    }
    if (nova === atual) {
      setMsg("A nova senha precisa ser diferente da atual.");
      return;
    }
    setEnviando(true);
    setMsg("");

    // confere a senha atual entrando de novo com o mesmo e-mail
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      setEnviando(false);
      setMsg("Sessão expirada. Entre novamente.");
      return;
    }
    const { error: erroAtual } = await supabase.auth.signInWithPassword({
      email,
      password: atual,
    });
    if (erroAtual) {
      setEnviando(false);
      setMsg("A senha atual está incorreta.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: nova });
    setEnviando(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setAtual("");
    setNova("");
    setRepete("");
    setOk(true);
    setMsg("Senha alterada ✓");
  }

  return (
    <form onSubmit={trocar} className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Alterar minha senha</h2>
      <p className="text-sm text-gray-600">
        Use uma senha só do PedeEasy, com pelo menos 8 caracteres.
      </p>
      <label className="block text-sm">
        Senha atual
        <input
          type="password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          autoComplete="current-password"
          required
          className={campo}
        />
      </label>
      <label className="block text-sm">
        Nova senha
        <input
          type="password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          autoComplete="new-password"
          required
          className={campo}
        />
      </label>
      <label className="block text-sm">
        Repita a nova senha
        <input
          type="password"
          value={repete}
          onChange={(e) => setRepete(e.target.value)}
          autoComplete="new-password"
          required
          className={campo}
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {enviando ? "Salvando..." : "Alterar senha"}
        </button>
        {msg && (
          <span className={`text-sm ${ok ? "text-green-700" : "text-red-600"}`}>
            {msg}
          </span>
        )}
      </div>
    </form>
  );
}

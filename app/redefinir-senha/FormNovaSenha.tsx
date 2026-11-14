"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border p-3";

export default function FormNovaSenha() {
  const [supabase] = useState(() => createClient());
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [feito, setFeito] = useState(false);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    const f = new FormData(e.currentTarget);
    const senha = String(f.get("senha"));
    const confirmacao = String(f.get("confirmacao"));

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }
    setFeito(true);
  }

  if (feito) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-bold">Senha alterada ✓</h1>
        <p className="mt-3 text-sm text-gray-600">
          Pronto! Você já está conectado. Volte ao cardápio da loja onde queria
          pedir, ou, se você é dono de loja, abra o painel.
        </p>
        <a
          href="/admin"
          className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white"
        >
          Abrir o painel da loja
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Criar nova senha</h1>
      <form onSubmit={salvar} className="mt-6 space-y-3">
        <input
          name="senha"
          type="password"
          placeholder="Nova senha (mínimo 6 caracteres)"
          minLength={6}
          required
          className={campo}
        />
        <input
          name="confirmacao"
          type="password"
          placeholder="Repita a nova senha"
          minLength={6}
          required
          className={campo}
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
        >
          {carregando ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </main>
  );
}
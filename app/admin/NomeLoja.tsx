"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border bg-white p-2 text-black";

// Nome da loja: é o título que o cliente vê no cardápio. O endereço (slug) não muda.
export default function NomeLoja({
  lojaId,
  nome,
  onSalvo,
}: {
  lojaId: string;
  nome: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [valor, setValor] = useState(nome);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = valor.replace(/\s+/g, " ").trim();
    setOk(false);
    if (n.length < 2) {
      setMsg("O nome precisa ter pelo menos 2 letras.");
      return;
    }
    if (n.length > 60) {
      setMsg("O nome pode ter no máximo 60 caracteres.");
      return;
    }
    const { error } = await supabase
      .from("lojas")
      .update({ nome: n })
      .eq("id", lojaId);
    if (error) {
      setMsg(error.message);
      return;
    }
    setValor(n);
    setOk(true);
    setMsg("Nome salvo ✓");
    onSalvo();
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Nome da loja</h2>
      <p className="text-sm text-gray-600">
        É o nome que os clientes veem no cardápio e nas mensagens. O endereço
        do cardápio (o link) continua o mesmo.
      </p>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        maxLength={60}
        autoComplete="off"
        className={campo}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Salvar
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

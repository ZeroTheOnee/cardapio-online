"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border bg-white p-2 text-black";

// Nome do recebedor que vai dentro do código "Pix copia e cola".
export default function NomePix({
  lojaId,
  nomePix,
  nomeLoja,
  onSalvo,
}: {
  lojaId: string;
  nomePix: string | null;
  nomeLoja: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [valor, setValor] = useState(nomePix ?? "");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    const n = valor.replace(/\s+/g, " ").trim();
    if (n.length > 60) {
      setMsg("No máximo 60 caracteres.");
      return;
    }
    const { error } = await supabase
      .from("lojas")
      .update({ nome_pix: n || null })
      .eq("id", lojaId);
    if (error) {
      setMsg(error.message);
      return;
    }
    setValor(n);
    setOk(true);
    setMsg(n ? "Salvo ✓" : "Nome removido: o cliente não verá o nome do recebedor ✓");
    onSalvo();
  }

  return (
    <form onSubmit={salvar} className="mt-6 space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Nome de quem recebe o Pix</h2>
      <p className="text-sm text-gray-600">
        Aparece para o cliente junto do código Pix, para ele conferir se o nome
        que o banco mostrar na hora de pagar é o mesmo. Escreva o nome
        exatamente como aparece no banco (o titular da chave Pix). Deixe vazio
        para não mostrar.
      </p>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        maxLength={60}
        placeholder={`Ex.: ${nomeLoja}`}
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

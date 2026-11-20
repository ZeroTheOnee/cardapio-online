"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RenomearProduto({
  produtoId,
  produtoNome,
  onSalvo,
}: {
  produtoId: string;
  produtoNome: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(produtoNome);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    const novo = nome.trim();
    if (novo.length < 1 || novo.length > 80) {
      setErro("O nome deve ter de 1 a 80 caracteres.");
      return;
    }
    setSalvando(true);
    setErro("");
    const { data, error } = await supabase
      .from("produtos")
      .update({ nome: novo })
      .eq("id", produtoId)
      .select("id");
    setSalvando(false);
    if (error || !data || data.length === 0) {
      setErro(error?.message ?? "Não foi possível salvar.");
      return;
    }
    setEditando(false);
    onSalvo();
  }

  if (!editando) {
    return (
      <button
        onClick={() => {
          setNome(produtoNome);
          setEditando(true);
        }}
        className="rounded-lg border border-gray-400 px-3 py-1 text-sm text-gray-800"
      >
        Renomear
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={80}
        autoFocus
        className="rounded-lg border px-2 py-1 text-sm"
      />
      <button
        onClick={salvar}
        disabled={salvando}
        className="rounded-lg bg-gray-900 px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>
      <button onClick={() => setEditando(false)} className="text-sm underline">
        Cancelar
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </span>
  );
}

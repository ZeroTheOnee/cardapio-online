"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Caminho do arquivo dentro do bucket "lojas" a partir da URL pública da foto
function caminhoDaFoto(url: string | null): string | null {
  if (!url) return null;
  const marca = "/lojas/";
  const i = url.indexOf(marca);
  if (i === -1) return null;
  const caminho = decodeURIComponent(url.slice(i + marca.length).split("?")[0]);
  return caminho || null;
}

export default function ApagarProduto({
  produtoId,
  produtoNome,
  onSalvo,
}: {
  produtoId: string;
  produtoNome: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [apagando, setApagando] = useState(false);
  const [msg, setMsg] = useState("");

  async function apagar() {
    if (
      !confirm(
        `Apagar "${produtoNome}" de vez?\n\n` +
          "Os pedidos antigos continuam no histórico. " +
          "Se você só quer tirar do cardápio por um tempo, use a opção de ocultar (Ativo) em vez de apagar."
      )
    )
      return;

    setApagando(true);
    setMsg("");

    // guarda o endereço da foto antes de apagar, para limpar o arquivo depois
    const { data: antes } = await supabase
      .from("produtos")
      .select("imagem_url")
      .eq("id", produtoId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", produtoId)
      .select("id");

    if (error || !data || data.length === 0) {
      setMsg(error?.message ?? "Não foi possível apagar o produto.");
      setApagando(false);
      return;
    }

    // melhor esforço: remove a foto do armazenamento (se falhar, o produto já foi apagado)
    const caminho = caminhoDaFoto(antes?.imagem_url ?? null);
    if (caminho) {
      await supabase.storage.from("lojas").remove([caminho]);
    }

    setApagando(false);
    onSalvo();
  }

  return (
    <span className="inline-flex items-center gap-2">
      {msg && <span className="text-xs text-red-600">{msg}</span>}
      <button
        onClick={apagar}
        disabled={apagando}
        className="rounded-lg border border-red-600 px-3 py-1 text-sm text-red-600 disabled:opacity-50"
      >
        {apagando ? "Apagando..." : "Apagar produto"}
      </button>
    </span>
  );
}

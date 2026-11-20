"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Copia o produto (categoria, descrição, preço, estoque, foto e grupos de opções).
// A cópia nasce DESATIVADA: o dono ajusta nome e preço e depois liga em "Ativo".
export default function DuplicarProduto({
  lojaId,
  produtoId,
  onSalvo,
}: {
  lojaId: string;
  produtoId: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [duplicando, setDuplicando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);

  async function duplicar() {
    setDuplicando(true);
    setMsg(null);

    const { data: origem, error: erroLer } = await supabase
      .from("produtos")
      .select("nome, descricao, preco, estoque, categoria_id, imagem_url")
      .eq("id", produtoId)
      .single();
    if (erroLer || !origem) {
      setMsg({ texto: erroLer?.message ?? "Não foi possível ler o produto.", erro: true });
      setDuplicando(false);
      return;
    }

    const nomeCopia = `${origem.nome} (cópia)`;
    const { data: novo, error: erroNovo } = await supabase
      .from("produtos")
      .insert({
        loja_id: lojaId,
        categoria_id: origem.categoria_id,
        nome: nomeCopia,
        descricao: origem.descricao,
        preco: origem.preco,
        estoque: origem.estoque,
        ativo: false,
      })
      .select("id")
      .single();
    if (erroNovo || !novo) {
      setMsg({ texto: erroNovo?.message ?? "Não foi possível duplicar.", erro: true });
      setDuplicando(false);
      return;
    }

    const avisos: string[] = [];

    // mesmos grupos de opções
    const { data: ligacoes } = await supabase
      .from("produto_grupos")
      .select("grupo_id")
      .eq("produto_id", produtoId);
    if (ligacoes && ligacoes.length > 0) {
      const { error } = await supabase.from("produto_grupos").insert(
        ligacoes.map((l) => ({ produto_id: novo.id, grupo_id: l.grupo_id, loja_id: lojaId }))
      );
      if (error) avisos.push("os grupos de opções não foram copiados");
    }

    // foto: cópia própria do arquivo (assim apagar um produto não tira a foto do outro)
    if (origem.imagem_url) {
      try {
        const resposta = await fetch(origem.imagem_url);
        if (!resposta.ok) throw new Error("download");
        const arquivo = await resposta.blob();
        const caminho = `${lojaId}/produto-${novo.id}-${crypto.randomUUID()}.jpg`;
        const { error: erroUp } = await supabase.storage
          .from("lojas")
          .upload(caminho, arquivo, { contentType: "image/jpeg", cacheControl: "3600" });
        if (erroUp) throw erroUp;
        const { data: pub } = supabase.storage.from("lojas").getPublicUrl(caminho);
        const { error: erroUrl } = await supabase
          .from("produtos")
          .update({ imagem_url: pub.publicUrl })
          .eq("id", novo.id);
        if (erroUrl) throw erroUrl;
      } catch {
        avisos.push("a foto não foi copiada (envie de novo no produto novo)");
      }
    }

    setDuplicando(false);
    setMsg({
      texto:
        `Criado "${nomeCopia}" desativado. Ajuste nome e preço e ative.` +
        (avisos.length ? ` Atenção: ${avisos.join("; ")}.` : ""),
      erro: avisos.length > 0,
    });
    onSalvo();
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {msg && (
        <span className={`text-xs ${msg.erro ? "text-red-600" : "text-green-700"}`}>
          {msg.texto}
        </span>
      )}
      <button
        onClick={duplicar}
        disabled={duplicando}
        className="rounded-lg border border-gray-400 px-3 py-1 text-sm text-gray-800 disabled:opacity-50"
      >
        {duplicando ? "Duplicando..." : "Duplicar produto"}
      </button>
    </span>
  );
}

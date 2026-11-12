"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reduzirImagem, caminhoDoStorage } from "@/lib/imagem";

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

export default function FotoProduto({
  lojaId,
  produtoId,
  url,
  onMudou,
}: {
  lojaId: string;
  produtoId: string;
  url: string | null;
  onMudou: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [atual, setAtual] = useState(url);
  const [ocupada, setOcupada] = useState(false);
  const [msg, setMsg] = useState("");

  async function enviar(file?: File) {
    if (!file) return;
    if (!TIPOS_ACEITOS.includes(file.type)) {
      setMsg("Escolha uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setMsg("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setOcupada(true);
    setMsg("Enviando...");
    let caminhoNovo: string | null = null;
    try {
      const jpeg = await reduzirImagem(file, 800);
      caminhoNovo = `${lojaId}/produto-${produtoId}-${crypto.randomUUID()}.jpg`;
      const { error: erroUpload } = await supabase.storage
        .from("lojas")
        .upload(caminhoNovo, jpeg, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
        });
      if (erroUpload) throw erroUpload;

      const { data } = supabase.storage.from("lojas").getPublicUrl(caminhoNovo);
      const { error: erroSalvar } = await supabase
        .from("produtos")
        .update({ imagem_url: data.publicUrl })
        .eq("id", produtoId);
      if (erroSalvar) throw erroSalvar;

      const caminhoAntigo = caminhoDoStorage(atual, lojaId);
      setAtual(data.publicUrl);
      caminhoNovo = null;

      if (caminhoAntigo) {
        await supabase.storage.from("lojas").remove([caminhoAntigo]);
      }
      setMsg("Foto atualizada ✓");
      onMudou();
    } catch (erro) {
      if (caminhoNovo) {
        await supabase.storage.from("lojas").remove([caminhoNovo]);
      }
      setMsg(
        erro instanceof Error ? erro.message : "Não foi possível enviar a foto."
      );
    } finally {
      setOcupada(false);
    }
  }

  async function apagar() {
    if (!atual) return;
    setOcupada(true);
    setMsg("Apagando...");
    const caminho = caminhoDoStorage(atual, lojaId);

    const { error } = await supabase
      .from("produtos")
      .update({ imagem_url: null })
      .eq("id", produtoId);
    if (error) {
      setMsg(error.message);
      setOcupada(false);
      return;
    }
    if (caminho) {
      await supabase.storage.from("lojas").remove([caminho]);
    }
    setAtual(null);
    setMsg("Foto removida ✓");
    setOcupada(false);
    onMudou();
  }

  return (
    <div className="flex items-center gap-3">
      {atual ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={atual}
          alt=""
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
          Sem foto
        </div>
      )}
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg border px-3 py-1 text-sm">
            {ocupada ? "Aguarde..." : atual ? "Trocar foto" : "Enviar foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={ocupada}
              className="sr-only"
              onChange={(e) => {
                enviar(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </label>
          {atual && (
            <button
              type="button"
              disabled={ocupada}
              onClick={apagar}
              className="rounded-lg border border-red-600 px-3 py-1 text-sm text-red-700"
            >
              Apagar
            </button>
          )}
        </div>
        {msg && (
          <p role="status" className="text-xs text-gray-600">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
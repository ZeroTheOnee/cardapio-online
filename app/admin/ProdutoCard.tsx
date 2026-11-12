"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FotoProduto from "./FotoProduto";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  ativo: boolean;
  imagem_url?: string | null;
};

const campo = "w-full rounded-lg border p-2";

export default function ProdutoCard({
  p,
  lojaId,
  onSalvo,
}: {
  p: Produto;
  lojaId: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [preco, setPreco] = useState(String(p.preco));
  const [estoque, setEstoque] = useState(String(p.estoque));
  const [ativo, setAtivo] = useState(p.ativo);
  const [msg, setMsg] = useState("");

  async function salvar() {
    const precoNum = Number(preco.replace(",", "."));
    const estoqueNum = parseInt(estoque, 10);
    if (!(precoNum >= 0) || !(estoqueNum >= 0)) {
      setMsg("Valores inválidos.");
      return;
    }
    const { error } = await supabase
      .from("produtos")
      .update({ preco: precoNum, estoque: estoqueNum, ativo })
      .eq("id", p.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Salvo ✓");
    onSalvo();
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="font-medium">{p.nome}</p>

      <div className="mt-3">
        <FotoProduto
          lojaId={lojaId}
          produtoId={p.id}
          url={p.imagem_url ?? null}
          onMudou={onSalvo}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm">
          Preço (R$)
          <input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            inputMode="decimal"
            className={campo}
          />
        </label>
        <label className="text-sm">
          Estoque
          <input
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
            inputMode="numeric"
            className={campo}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Aparece no cardápio
        </label>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
          <button
            onClick={salvar}
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
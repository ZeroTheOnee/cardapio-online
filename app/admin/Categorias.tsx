"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Categoria = { id: string; nome: string; ordem: number };

const campo = "w-full rounded-lg border bg-white p-2 text-black";

export default function Categorias({
  lojaId,
  categorias,
  contagem,
  onSalvo,
}: {
  lojaId: string;
  categorias: Categoria[];
  contagem: Record<string, number>;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState("");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) {
      setMsg("Digite o nome da categoria.");
      return;
    }
    const proxima =
      categorias.length > 0 ? Math.max(...categorias.map((c) => c.ordem)) + 1 : 1;
    const { error } = await supabase
      .from("categorias")
      .insert({ loja_id: lojaId, nome: n, ordem: proxima });
    if (error) {
      setMsg(error.message);
      return;
    }
    setNome("");
    setMsg("Categoria adicionada ✓");
    onSalvo();
  }

  // troca a posição com a vizinha, renumerando tudo (1, 2, 3...) para não haver empates
  async function mover(indice: number, delta: -1 | 1) {
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= categorias.length) return;
    const nova = [...categorias];
    [nova[indice], nova[alvo]] = [nova[alvo], nova[indice]];
    const resultados = await Promise.all(
      nova.map((c, i) =>
        supabase.from("categorias").update({ ordem: i + 1 }).eq("id", c.id)
      )
    );
    const falha = resultados.find((r) => r.error);
    if (falha?.error) {
      setMsg(falha.error.message);
      return;
    }
    onSalvo();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Categorias do cardápio</h2>
      <p className="text-sm text-gray-600">
        São as seções que o cliente vê (por exemplo: Lanches, Bebidas,
        Sobremesas). Cada produto precisa estar numa categoria para aparecer no
        cardápio.
      </p>

      <form onSubmit={criar} className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nova categoria (ex.: Lanches)"
          className={campo}
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-black px-4 py-2 text-white"
        >
          Adicionar
        </button>
      </form>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}

      {categorias.length === 0 && (
        <p className="text-sm text-gray-500">
          Nenhuma categoria ainda. Crie a primeira acima.
        </p>
      )}

      <ul className="space-y-2">
        {categorias.map((c, i) => (
          <LinhaCategoria
            key={c.id}
            c={c}
            qtdProdutos={contagem[c.id] ?? 0}
            podeSubir={i > 0}
            podeDescer={i < categorias.length - 1}
            onMover={(d) => mover(i, d)}
            onSalvo={onSalvo}
          />
        ))}
      </ul>
    </div>
  );
}

function LinhaCategoria({
  c,
  qtdProdutos,
  podeSubir,
  podeDescer,
  onMover,
  onSalvo,
}: {
  c: Categoria;
  qtdProdutos: number;
  podeSubir: boolean;
  podeDescer: boolean;
  onMover: (d: -1 | 1) => void;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [nome, setNome] = useState(c.nome);
  const [msg, setMsg] = useState("");

  async function salvar() {
    const n = nome.trim();
    if (!n) {
      setMsg("O nome não pode ficar vazio.");
      return;
    }
    const { error } = await supabase
      .from("categorias")
      .update({ nome: n })
      .eq("id", c.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Salvo ✓");
    onSalvo();
  }

  async function apagar() {
    if (qtdProdutos > 0) {
      setMsg(
        `Esta categoria tem ${qtdProdutos} produto(s). Mude ou apague os produtos antes.`
      );
      return;
    }
    if (!confirm(`Apagar a categoria "${c.nome}"?`)) return;
    const { error } = await supabase.from("categorias").delete().eq("id", c.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    onSalvo();
  }

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            onClick={() => onMover(-1)}
            disabled={!podeSubir}
            aria-label="Subir"
            className="px-2 leading-none disabled:opacity-30"
          >
            ▲
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={!podeDescer}
            aria-label="Descer"
            className="px-2 leading-none disabled:opacity-30"
          >
            ▼
          </button>
        </div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={campo}
        />
        <button
          onClick={salvar}
          className="shrink-0 rounded-lg bg-black px-3 py-2 text-white"
        >
          Salvar
        </button>
        <button
          onClick={apagar}
          className="shrink-0 rounded-lg border border-red-600 px-3 py-2 text-red-600"
        >
          Apagar
        </button>
      </div>
      <p className="mt-1 pl-10 text-xs text-gray-500">
        {qtdProdutos} {qtdProdutos === 1 ? "produto" : "produtos"}
        {msg && <span className="ml-2 text-gray-700">{msg}</span>}
      </p>
    </li>
  );
}

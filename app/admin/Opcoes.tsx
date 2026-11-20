"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GrupoLib } from "./Grupos";
import ApagarProduto from "./ApagarProduto";
import DuplicarProduto from "./DuplicarProduto";

function descricao(g: GrupoLib) {
  const ativas = g.opcoes.filter((o) => o.ativo).length;
  const regra =
    g.maximo === 1
      ? g.minimo >= 1
        ? "escolher 1 (obrigatório)"
        : "escolher 1 (opcional)"
      : g.minimo >= 1
      ? `marcar até ${g.maximo} (obrigatório)`
      : `marcar até ${g.maximo} (opcional)`;
  return `${regra} · ${ativas} ${ativas === 1 ? "opção" : "opções"}`;
}

// Dentro de cada produto: só MARCA quais grupos (criados na biblioteca) ele usa.
export default function Opcoes({
  lojaId,
  produtoId,
  produtoNome,
  grupos,
  vinculados,
  onSalvo,
}: {
  lojaId: string;
  produtoId: string;
  produtoNome: string;
  grupos: GrupoLib[];
  vinculados: string[];
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState<string[]>(vinculados);
  const [msg, setMsg] = useState("");

  const total = marcados.filter((id) => grupos.some((g) => g.id === id)).length;

  async function alternar(g: GrupoLib) {
    const ligado = marcados.includes(g.id);
    setMsg("");
    // atualiza na hora; desfaz se o banco recusar
    setMarcados((m) => (ligado ? m.filter((x) => x !== g.id) : [...m, g.id]));
    const { error } = ligado
      ? await supabase
          .from("produto_grupos")
          .delete()
          .eq("produto_id", produtoId)
          .eq("grupo_id", g.id)
      : await supabase
          .from("produto_grupos")
          .insert({ produto_id: produtoId, grupo_id: g.id, loja_id: lojaId });
    if (error) {
      setMarcados((m) => (ligado ? [...m, g.id] : m.filter((x) => x !== g.id)));
      setMsg(error.message);
      return;
    }
    onSalvo();
  }

  return (
    <div className="-mt-1 rounded-b-lg border border-t-0 bg-gray-50 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setAberto((v) => !v)} className="text-sm font-medium underline">
          {aberto ? "Fechar opções ▲" : "Opções e adicionais ▼"}
          {!aberto && total > 0 && (
            <span className="ml-1 font-normal text-gray-500">({total} no produto)</span>
          )}
        </button>
        <span className="inline-flex flex-wrap items-center gap-2">
          <DuplicarProduto lojaId={lojaId} produtoId={produtoId} onSalvo={onSalvo} />
          <ApagarProduto produtoId={produtoId} produtoNome={produtoNome} onSalvo={onSalvo} />
        </span>
      </div>

      {aberto && (
        <div className="mt-3 space-y-2 pb-2">
          {grupos.length === 0 ? (
            <p className="text-sm text-gray-600">
              Você ainda não criou nenhum grupo. Crie no quadro &quot;Opções e adicionais&quot;
              no topo desta aba e volte aqui para marcar.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-600">
                Marque os grupos que este produto usa:
              </p>
              <ul className="space-y-2">
                {grupos.map((g) => (
                  <li key={g.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3">
                      <input
                        type="checkbox"
                        checked={marcados.includes(g.id)}
                        onChange={() => alternar(g)}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="block font-medium">{g.nome}</span>
                        <span className="block text-xs text-gray-500">{descricao(g)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}
    </div>
  );
}

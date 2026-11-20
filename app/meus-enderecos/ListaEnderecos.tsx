"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NovoEndereco, { type EnderecoNovo } from "../[slug]/NovoEndereco";

type Endereco = EnderecoNovo & {
  complemento: string | null;
  referencia: string | null;
};

const ok = (t: string | null) => !!t && t.trim() !== "" && t.trim() !== "-";

function rotulo(e: Endereco) {
  const ruaNum = ok(e.numero) ? `${e.rua}, ${e.numero}` : e.rua;
  return [ruaNum, e.bairro, e.cidade].filter(ok).join(" - ");
}

export default function ListaEnderecos({ inicial }: { inicial: Endereco[] }) {
  const [supabase] = useState(() => createClient());
  const [lista, setLista] = useState<Endereco[]>(inicial);
  const [erro, setErro] = useState("");

  async function apagar(e: Endereco) {
    if (!window.confirm(`Apagar o endereço "${rotulo(e)}"?`)) return;
    setErro("");
    const { data, error } = await supabase
      .from("enderecos")
      .delete()
      .eq("id", e.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setErro(error?.message ?? "Não foi possível apagar o endereço.");
      return;
    }
    setLista((l) => l.filter((x) => x.id !== e.id));
  }

  return (
    <div
      className="mt-4 space-y-3"
      style={{ "--cor": "#111827", "--cor-texto": "#ffffff" } as React.CSSProperties}
    >
      {lista.length === 0 && (
        <p className="text-gray-500">Você ainda não tem endereços salvos.</p>
      )}
      <ul className="space-y-2">
        {lista.map((e) => (
          <li
            key={e.id}
            className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
          >
            <div className="min-w-0 text-sm">
              <p className="font-medium">{rotulo(e)}</p>
              {ok(e.complemento) && <p className="text-gray-600">{e.complemento}</p>}
              {ok(e.referencia) && (
                <p className="text-gray-600">Ref.: {e.referencia}</p>
              )}
            </div>
            <button onClick={() => apagar(e)} className="text-sm text-red-600 underline">
              Apagar
            </button>
          </li>
        ))}
      </ul>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <NovoEndereco
        cidadePadrao={lista.find((e) => ok(e.cidade))?.cidade ?? ""}
        onCriado={(e) =>
          setLista((l) => [...l, { ...e, complemento: null, referencia: null }])
        }
      />
    </div>
  );
}

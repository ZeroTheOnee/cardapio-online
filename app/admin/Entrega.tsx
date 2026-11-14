"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Localidade = { id: string; nome: string; taxa: number; ativo: boolean };

const campo = "w-full rounded-lg border p-2";

function paraNumero(texto: string) {
  return Number(texto.replace(",", "."));
}

export default function Entrega({
  lojaId,
  taxaPadrao,
  localidades,
  onSalvo,
}: {
  lojaId: string;
  taxaPadrao: number;
  localidades: Localidade[];
  onSalvo: () => void;
}) {
  return (
    <div className="space-y-6">
      <TaxaPadrao lojaId={lojaId} taxaPadrao={taxaPadrao} onSalvo={onSalvo} />
      <NovaLocalidade lojaId={lojaId} onSalvo={onSalvo} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Suas localidades</h2>
        {localidades.length === 0 && (
          <p className="text-sm text-gray-500">
            Nenhuma localidade cadastrada. Enquanto não houver, vale a taxa
            padrão para todas as entregas.
          </p>
        )}
        {localidades.map((l) => (
          <LinhaLocalidade key={l.id} l={l} onSalvo={onSalvo} />
        ))}
      </div>
    </div>
  );
}

function TaxaPadrao({
  lojaId,
  taxaPadrao,
  onSalvo,
}: {
  lojaId: string;
  taxaPadrao: number;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [taxa, setTaxa] = useState(String(taxaPadrao).replace(".", ","));
  const [msg, setMsg] = useState("");

  async function salvar() {
    const n = paraNumero(taxa);
    if (!(n >= 0)) {
      setMsg("Valor inválido.");
      return;
    }
    const { error } = await supabase
      .from("lojas")
      .update({ taxa_entrega: n })
      .eq("id", lojaId);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Salvo ✓");
    onSalvo();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Taxa padrão de entrega</h2>
      <p className="text-sm text-gray-600">
        Vale para todas as entregas quando a loja não tem localidades
        cadastradas. Se você cadastrar localidades abaixo, a taxa de cada uma
        passa a valer no lugar desta.
      </p>
      <div className="flex items-center gap-3">
        <input
          value={taxa}
          onChange={(e) => setTaxa(e.target.value)}
          inputMode="decimal"
          className={campo}
        />
        <button
          onClick={salvar}
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Salvar
        </button>
      </div>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  );
}

function NovaLocalidade({
  lojaId,
  onSalvo,
}: {
  lojaId: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState("");
  const [msg, setMsg] = useState("");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const n = paraNumero(taxa);
    if (!nome.trim() || !(n >= 0)) {
      setMsg("Preencha o nome e uma taxa válida.");
      return;
    }
    const { error } = await supabase
      .from("localidades")
      .insert({ loja_id: lojaId, nome: nome.trim(), taxa: n });
    if (error) {
      setMsg(
        error.code === "23505"
          ? "Já existe uma localidade com esse nome."
          : error.message
      );
      return;
    }
    setNome("");
    setTaxa("");
    setMsg("Localidade adicionada ✓");
    onSalvo();
  }

  return (
    <form onSubmit={criar} className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Nova localidade</h2>
      <p className="text-sm text-gray-600">
        Bairro, distrito ou cidade que a loja atende, com a taxa de cada um.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome (ex.: Centro)"
          className={campo}
        />
        <input
          value={taxa}
          onChange={(e) => setTaxa(e.target.value)}
          placeholder="Taxa (ex.: 5,00)"
          inputMode="decimal"
          className={campo}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Adicionar
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </form>
  );
}

function LinhaLocalidade({
  l,
  onSalvo,
}: {
  l: Localidade;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [nome, setNome] = useState(l.nome);
  const [taxa, setTaxa] = useState(String(l.taxa).replace(".", ","));
  const [ativo, setAtivo] = useState(l.ativo);
  const [msg, setMsg] = useState("");

  async function salvar() {
    const n = paraNumero(taxa);
    if (!nome.trim() || !(n >= 0)) {
      setMsg("Valores inválidos.");
      return;
    }
    const { error } = await supabase
      .from("localidades")
      .update({ nome: nome.trim(), taxa: n, ativo })
      .eq("id", l.id);
    if (error) {
      setMsg(
        error.code === "23505"
          ? "Já existe uma localidade com esse nome."
          : error.message
      );
      return;
    }
    setMsg("Salvo ✓");
    onSalvo();
  }

  async function apagar() {
    if (!confirm(`Apagar a localidade "${l.nome}"?`)) return;
    const { error } = await supabase
      .from("localidades")
      .delete()
      .eq("id", l.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    onSalvo();
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Nome
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={campo}
          />
        </label>
        <label className="text-sm">
          Taxa (R$)
          <input
            value={taxa}
            onChange={(e) => setTaxa(e.target.value)}
            inputMode="decimal"
            className={campo}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Atende esta localidade
        </label>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
          <button
            onClick={apagar}
            className="rounded-lg border border-red-600 px-4 py-2 text-red-600"
          >
            Apagar
          </button>
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

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type EnderecoNovo = {
  id: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  localidade_padrao?: string | null;
};

type LocalidadeOpt = { id: string; nome: string; taxa: number };

// Cadastro de mais um endereço de entrega, dentro do checkout (cliente logado).
export default function NovoEndereco({
  cidadePadrao,
  localidades,
  onCriado,
}: {
  cidadePadrao: string;
  // quando a loja tem localidades de entrega, o endereço já guarda a escolhida
  localidades?: LocalidadeOpt[];
  onCriado: (e: EnderecoNovo) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({
    rua: "",
    numero: "",
    bairro: "",
    cidade: cidadePadrao,
    complemento: "",
    referencia: "",
    localidade: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const rua = f.rua.trim();
    const numero = f.numero.trim();
    const bairro = f.bairro.trim();
    const cidade = f.cidade.trim();
    if (!rua || !numero || !bairro || !cidade) {
      setErro("Preencha rua, número, bairro e cidade.");
      return;
    }
    if (localidades && localidades.length > 0 && !f.localidade) {
      setErro("Escolha a localidade da entrega.");
      return;
    }
    setSalvando(true);
    setErro("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setErro("Entre na sua conta para salvar o endereço.");
      setSalvando(false);
      return;
    }
    const { data, error } = await supabase
      .from("enderecos")
      .insert({
        cliente_id: u.user.id,
        rua,
        numero,
        bairro,
        cidade,
        complemento: f.complemento.trim() || null,
        referencia: f.referencia.trim() || null,
        localidade_padrao: f.localidade || null,
      })
      .select("id, rua, numero, bairro, cidade, localidade_padrao")
      .single();
    setSalvando(false);
    if (error || !data) {
      setErro(error?.message ?? "Não foi possível salvar o endereço.");
      return;
    }
    onCriado(data);
    setAberto(false);
    setF({ ...f, rua: "", numero: "", bairro: "", complemento: "", referencia: "" });
  }

  const campo = "w-full rounded-lg border bg-white p-3 text-black";

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-sm underline">
        + Adicionar outro endereço
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-white p-3">
      <p className="text-sm font-semibold">Novo endereço</p>
      <input className={campo} placeholder="Rua" maxLength={120} value={f.rua}
        onChange={(e) => setF({ ...f, rua: e.target.value })} />
      <div className="flex gap-2">
        <input className={campo} placeholder="Número" maxLength={20} value={f.numero}
          onChange={(e) => setF({ ...f, numero: e.target.value })} />
        <input className={campo} placeholder="Bairro" maxLength={80} value={f.bairro}
          onChange={(e) => setF({ ...f, bairro: e.target.value })} />
      </div>
      <input className={campo} placeholder="Cidade" maxLength={80} value={f.cidade}
        onChange={(e) => setF({ ...f, cidade: e.target.value })} />
      {localidades && localidades.length > 0 && (
        <select
          className={campo}
          value={f.localidade}
          onChange={(e) => setF({ ...f, localidade: e.target.value })}
        >
          <option value="">Localidade da entrega...</option>
          {localidades.map((l) => (
            <option key={l.id} value={l.nome}>
              {l.nome} — {l.taxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </option>
          ))}
        </select>
      )}
      <input className={campo} placeholder="Complemento (opcional)" maxLength={80}
        value={f.complemento} onChange={(e) => setF({ ...f, complemento: e.target.value })} />
      <input className={campo} placeholder="Ponto de referência (opcional)" maxLength={120}
        value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando}
          className="flex-1 rounded-lg bg-[var(--cor)] py-2 text-[var(--cor-texto)] disabled:opacity-40">
          {salvando ? "Salvando..." : "Salvar endereço"}
        </button>
        <button onClick={() => setAberto(false)} className="rounded-lg border px-4 py-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}

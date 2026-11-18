"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type OpcaoLib = {
  id: string;
  nome: string;
  preco_extra: number;
  ativo: boolean;
  ordem: number;
};
export type GrupoLib = {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  ordem: number;
  opcoes: OpcaoLib[];
};

type Opcao = OpcaoLib;
type Grupo = GrupoLib;

const campo = "w-full rounded-lg border bg-white p-2 text-black";

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "4,50" ou "4.50" -> 4.5 (ou null se inválido)
function lerPreco(t: string): number | null {
  const n = Number(t.replace(",", ".").trim() || "0");
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

// Biblioteca de grupos da loja: aqui só se CRIA e edita. Quem usa cada grupo
// é escolhido dentro de cada produto (componente Opcoes).
export default function Grupos({
  lojaId,
  grupos,
  uso,
  onSalvo,
}: {
  lojaId: string;
  grupos: GrupoLib[];
  uso: Record<string, number>;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState("");
  const [nome, setNome] = useState("");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) {
      setMsg("Digite o nome do grupo (ex.: Tamanho, Adicionais).");
      return;
    }
    if (n.length > 60) {
      setMsg("O nome do grupo pode ter no máximo 60 caracteres.");
      return;
    }
    const proxima = grupos.length > 0 ? Math.max(...grupos.map((g) => g.ordem)) + 1 : 1;
    // padrão: opcional, várias opções (serve para adicionais); o dono ajusta em seguida
    const { error } = await supabase.from("grupos_opcao").insert({
      loja_id: lojaId,
      nome: n,
      minimo: 0,
      maximo: 5,
      ordem: proxima,
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    setNome("");
    setMsg("Grupo criado ✓ Agora adicione as opções dele abaixo.");
    setAberto(true);
    onSalvo();
  }

  async function mover(i: number, d: -1 | 1) {
    const nova = [...grupos];
    [nova[i], nova[i + d]] = [nova[i + d], nova[i]];
    const r = await Promise.all(
      nova.map((g, n) =>
        supabase.from("grupos_opcao").update({ ordem: n + 1 }).eq("id", g.id)
      )
    );
    const falha = r.find((x) => x.error);
    if (falha?.error) {
      setMsg(falha.error.message);
      return;
    }
    onSalvo();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Opções e adicionais</h2>
        <button
          onClick={() => setAberto((v) => !v)}
          className="text-sm underline"
        >
          {aberto ? "Esconder ▲" : `Ver grupos (${grupos.length}) ▼`}
        </button>
      </div>
      <p className="text-sm text-gray-600">
        Crie aqui os grupos de escolha (Tamanho, Adicionais, Ponto da carne...) uma
        vez só. Depois, em cada produto, é só marcar quais grupos ele usa.
      </p>

      <form onSubmit={criar} className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
          placeholder="Novo grupo (ex.: Tamanho, Adicionais)"
          className={campo}
        />
        <button type="submit" className="shrink-0 rounded-lg bg-black px-4 py-2 text-white">
          Criar grupo
        </button>
      </form>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}

      {aberto && (
        <div className="space-y-3">
          {grupos.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum grupo ainda. Crie o primeiro acima.</p>
          )}
          {grupos.map((g, i) => (
            <LinhaGrupo
              key={g.id}
              lojaId={lojaId}
              g={g}
              usadoEm={uso[g.id] ?? 0}
              podeSubir={i > 0}
              podeDescer={i < grupos.length - 1}
              onMover={(d) => mover(i, d)}
              onMudou={onSalvo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaGrupo({
  lojaId,
  g,
  usadoEm,
  podeSubir,
  podeDescer,
  onMover,
  onMudou,
}: {
  lojaId: string;
  g: Grupo;
  usadoEm: number;
  podeSubir: boolean;
  podeDescer: boolean;
  onMover: (d: -1 | 1) => void;
  onMudou: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [nome, setNome] = useState(g.nome);
  // "tipo" traduz minimo/maximo em linguagem de dono de loja
  const tipoInicial =
    g.maximo === 1 && g.minimo === 1
      ? "uma"
      : g.maximo === 1
      ? "uma_opcional"
      : g.minimo > 0
      ? "varias_obrig"
      : "varias";
  const [tipo, setTipo] = useState(tipoInicial);
  const [max, setMax] = useState(String(g.maximo > 1 ? g.maximo : 5));
  const [msg, setMsg] = useState("");
  const [novaNome, setNovaNome] = useState("");
  const [novaPreco, setNovaPreco] = useState("");

  async function salvar() {
    const n = nome.trim();
    if (!n || n.length > 60) {
      setMsg("O nome do grupo precisa ter de 1 a 60 caracteres.");
      return;
    }
    const m = Math.max(1, Math.min(20, Math.floor(Number(max) || 1)));
    let minimo = 0;
    let maximo = 1;
    if (tipo === "uma") {
      minimo = 1;
      maximo = 1;
    } else if (tipo === "uma_opcional") {
      minimo = 0;
      maximo = 1;
    } else if (tipo === "varias_obrig") {
      minimo = 1;
      maximo = m;
    } else {
      minimo = 0;
      maximo = m;
    }
    const { error } = await supabase
      .from("grupos_opcao")
      .update({ nome: n, minimo, maximo })
      .eq("id", g.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Salvo ✓");
    onMudou();
  }

  async function apagar() {
    if (
      !confirm(
        `Apagar o grupo "${g.nome}" e todas as suas opções?` +
          (usadoEm > 0 ? `\n\nEle será removido de ${usadoEm} produto(s).` : "")
      )
    )
      return;
    const { error } = await supabase.from("grupos_opcao").delete().eq("id", g.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    onMudou();
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const n = novaNome.trim();
    const preco = lerPreco(novaPreco);
    if (!n || n.length > 60) {
      setMsg("O nome da opção precisa ter de 1 a 60 caracteres.");
      return;
    }
    if (preco === null) {
      setMsg("Valor extra inválido. Use algo como 3,50 (ou deixe vazio).");
      return;
    }
    const proxima = g.opcoes.length > 0 ? Math.max(...g.opcoes.map((o) => o.ordem)) + 1 : 1;
    const { error } = await supabase.from("opcoes").insert({
      loja_id: lojaId,
      grupo_id: g.id,
      nome: n,
      preco_extra: preco,
      ordem: proxima,
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    setNovaNome("");
    setNovaPreco("");
    setMsg("");
    onMudou();
  }

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            onClick={() => onMover(-1)}
            disabled={!podeSubir}
            aria-label="Subir grupo"
            className="px-2 leading-none disabled:opacity-30"
          >
            ▲
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={!podeDescer}
            aria-label="Descer grupo"
            className="px-2 leading-none disabled:opacity-30"
          >
            ▼
          </button>
        </div>
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} className={campo} />
      </div>
      <p className="mt-1 pl-10 text-xs text-gray-500">
        {usadoEm === 0
          ? "Ainda não usado em nenhum produto"
          : `Usado em ${usadoEm} ${usadoEm === 1 ? "produto" : "produtos"}`}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo + " sm:w-auto"}>
          <option value="uma">Escolher UMA (obrigatório)</option>
          <option value="uma_opcional">Escolher uma (opcional)</option>
          <option value="varias">Marcar várias (opcional)</option>
          <option value="varias_obrig">Marcar várias (obrigatório ao menos 1)</option>
        </select>
        {(tipo === "varias" || tipo === "varias_obrig") && (
          <label className="flex items-center gap-1">
            até
            <input
              value={max}
              onChange={(e) => setMax(e.target.value)}
              inputMode="numeric"
              className="w-14 rounded-lg border bg-white p-2 text-black"
            />
          </label>
        )}
        <button onClick={salvar} className="rounded-lg bg-black px-3 py-2 text-white">
          Salvar grupo
        </button>
        <button onClick={apagar} className="rounded-lg border border-red-600 px-3 py-2 text-red-600">
          Apagar
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {g.opcoes.map((o) => (
          <LinhaOpcao key={o.id} o={o} onMudou={onMudou} />
        ))}
        {g.opcoes.length === 0 && (
          <li className="text-sm text-gray-500">Nenhuma opção ainda. Adicione abaixo.</li>
        )}
      </ul>

      <form onSubmit={adicionar} className="mt-2 flex gap-2">
        <input
          value={novaNome}
          onChange={(e) => setNovaNome(e.target.value)}
          maxLength={60}
          placeholder="Opção (ex.: Bacon)"
          className={campo}
        />
        <input
          value={novaPreco}
          onChange={(e) => setNovaPreco(e.target.value)}
          placeholder="+ R$ (0)"
          inputMode="decimal"
          className={campo + " max-w-[7rem]"}
        />
        <button type="submit" className="shrink-0 rounded-lg bg-black px-3 py-2 text-white">
          +
        </button>
      </form>
      {msg && <p className="mt-1 text-sm text-gray-700">{msg}</p>}
    </div>
  );
}

function LinhaOpcao({ o, onMudou }: { o: Opcao; onMudou: () => void }) {
  const [supabase] = useState(() => createClient());
  const [nome, setNome] = useState(o.nome);
  const [preco, setPreco] = useState(String(o.preco_extra).replace(".", ","));
  const [msg, setMsg] = useState("");

  async function salvar() {
    const n = nome.trim();
    const p = lerPreco(preco);
    if (!n || n.length > 60 || p === null) {
      setMsg("Confira o nome (1 a 60 caracteres) e o valor.");
      return;
    }
    const { error } = await supabase
      .from("opcoes")
      .update({ nome: n, preco_extra: p })
      .eq("id", o.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("✓");
    onMudou();
  }

  async function alternarAtivo() {
    const { error } = await supabase.from("opcoes").update({ ativo: !o.ativo }).eq("id", o.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    onMudou();
  }

  async function apagar() {
    if (!confirm(`Apagar a opção "${o.nome}"?`)) return;
    const { error } = await supabase.from("opcoes").delete().eq("id", o.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    onMudou();
  }

  return (
    <li className={`flex items-center gap-2 ${o.ativo ? "" : "opacity-50"}`}>
      <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} className={campo} />
      <input
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
        inputMode="decimal"
        aria-label={`Valor extra de ${o.nome}`}
        className={campo + " max-w-[6rem]"}
      />
      <button onClick={salvar} className="shrink-0 rounded-lg border px-2 py-2 text-sm">
        Salvar
      </button>
      <button onClick={alternarAtivo} className="shrink-0 rounded-lg border px-2 py-2 text-sm">
        {o.ativo ? "Pausar" : "Ativar"}
      </button>
      <button
        onClick={apagar}
        aria-label={`Apagar ${o.nome}`}
        className="shrink-0 rounded-lg border border-red-600 px-2 py-2 text-sm text-red-600"
      >
        ✕
      </button>
      {msg && <span className="text-xs text-gray-600">{msg}</span>}
      <span className="sr-only">{dinheiro(o.preco_extra)}</span>
    </li>
  );
}

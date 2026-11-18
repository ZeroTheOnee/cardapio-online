"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Opcao = {
  id: string;
  nome: string;
  preco_extra: number;
  ativo: boolean;
  ordem: number;
};
type Grupo = {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  ordem: number;
  opcoes: Opcao[];
};

const campo = "w-full rounded-lg border bg-white p-2 text-black";

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "4,50" ou "4.50" -> 4.5 (ou null se inválido)
function lerPreco(t: string): number | null {
  const n = Number(t.replace(",", ".").trim() || "0");
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export default function Opcoes({
  lojaId,
  produtoId,
  produtoNome,
}: {
  lojaId: string;
  produtoId: string;
  produtoNome: string;
}) {
  const [supabase] = useState(() => createClient());
  const [aberto, setAberto] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("grupos_opcao")
      .select("id, nome, minimo, maximo, ordem, opcoes(id, nome, preco_extra, ativo, ordem)")
      .eq("produto_id", produtoId)
      .order("ordem");
    if (error) {
      setMsg(
        error.message.includes("grupos_opcao")
          ? "Falta rodar o SQL das opções no Supabase (migracao_opcoes.sql)."
          : error.message
      );
      setGrupos([]);
      return;
    }
    setMsg("");
    setGrupos(
      (data ?? []).map((g) => ({
        ...g,
        opcoes: [...((g.opcoes as Opcao[]) ?? [])].sort((a, b) => a.ordem - b.ordem),
      }))
    );
  }, [supabase, produtoId]);

  function alternar() {
    const novo = !aberto;
    setAberto(novo);
    if (novo && grupos === null) carregar();
  }

  async function novoGrupo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nome = String(f.get("nome") ?? "").trim();
    if (!nome) {
      setMsg("Digite o nome do grupo (ex.: Tamanho, Adicionais).");
      return;
    }
    const proxima = grupos && grupos.length > 0 ? Math.max(...grupos.map((g) => g.ordem)) + 1 : 1;
    // padrão: escolha opcional, várias opções (serve para adicionais); o dono ajusta depois
    const { error } = await supabase.from("grupos_opcao").insert({
      loja_id: lojaId,
      produto_id: produtoId,
      nome,
      minimo: 0,
      maximo: 5,
      ordem: proxima,
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    e.currentTarget.reset();
    await carregar();
  }

  return (
    <div className="-mt-1 rounded-b-lg border border-t-0 bg-gray-50 px-4 py-2">
      <button onClick={alternar} className="text-sm font-medium underline">
        {aberto ? "Fechar opções ▲" : "Opções e adicionais ▼"}
        {!aberto && grupos && grupos.length > 0 && (
          <span className="ml-1 font-normal text-gray-500">({grupos.length})</span>
        )}
      </button>

      {aberto && (
        <div className="mt-3 space-y-3 pb-2">
          <p className="text-xs text-gray-600">
            Perguntas que o cliente responde ao pedir &quot;{produtoNome}&quot;: tamanho, adicionais,
            ponto da carne, sem cebola... Cada opção pode ter um valor extra.
          </p>

          {grupos === null && <p className="text-sm text-gray-500">Carregando...</p>}

          {grupos?.map((g, i) => (
            <LinhaGrupo
              key={g.id}
              lojaId={lojaId}
              g={g}
              podeSubir={i > 0}
              podeDescer={i < grupos.length - 1}
              onMover={async (d) => {
                const a = grupos[i];
                const b = grupos[i + d];
                await Promise.all([
                  supabase.from("grupos_opcao").update({ ordem: b.ordem }).eq("id", a.id),
                  supabase.from("grupos_opcao").update({ ordem: a.ordem }).eq("id", b.id),
                ]);
                // se tinham a mesma ordem, renumera
                if (a.ordem === b.ordem) {
                  await Promise.all(
                    grupos.map((x, n) =>
                      supabase.from("grupos_opcao").update({ ordem: n + 1 }).eq("id", x.id)
                    )
                  );
                }
                carregar();
              }}
              onMudou={carregar}
            />
          ))}

          <form onSubmit={novoGrupo} className="flex gap-2">
            <input
              name="nome"
              placeholder="Novo grupo (ex.: Tamanho, Adicionais)"
              className={campo}
            />
            <button type="submit" className="shrink-0 rounded-lg bg-black px-3 py-2 text-white">
              Criar grupo
            </button>
          </form>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function LinhaGrupo({
  lojaId,
  g,
  podeSubir,
  podeDescer,
  onMover,
  onMudou,
}: {
  lojaId: string;
  g: Grupo;
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
    if (!n) {
      setMsg("O nome não pode ficar vazio.");
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
    if (!confirm(`Apagar o grupo "${g.nome}" e todas as suas opções?`)) return;
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
    if (!n) {
      setMsg("Digite o nome da opção.");
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
        <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
      </div>

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
    if (!n || p === null) {
      setMsg("Confira o nome e o valor.");
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
      <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
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

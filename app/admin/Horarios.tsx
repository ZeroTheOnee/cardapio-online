"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DIAS, type Horarios as TipoHorarios, type Periodo } from "@/lib/horario";

const campo = "rounded-lg border bg-white p-2 text-black";
const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // segunda a domingo
const PADRAO: Periodo = { abre: "18:00", fecha: "23:00" };

const completo = (h: TipoHorarios): TipoHorarios => {
  const r: TipoHorarios = {};
  for (let d = 0; d < 7; d++) r[String(d)] = (h[String(d)] ?? []).map((p) => ({ ...p }));
  return r;
};

const min = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Horário de funcionamento: a loja só recebe pedidos dentro dele (o servidor confere).
export default function Horarios({
  lojaId,
  usa,
  horarios,
  onSalvo,
}: {
  lojaId: string;
  usa: boolean;
  horarios: TipoHorarios;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [ligado, setLigado] = useState(usa);
  const [h, setH] = useState<TipoHorarios>(() => completo(horarios));
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  function mudar(dia: number, idx: number, parte: keyof Periodo, valor: string) {
    setMsg("");
    setH((a) => {
      const novo = completo(a);
      novo[String(dia)][idx] = { ...novo[String(dia)][idx], [parte]: valor };
      return novo;
    });
  }

  function alternarDia(dia: number, aberto: boolean) {
    setMsg("");
    setH((a) => {
      const novo = completo(a);
      novo[String(dia)] = aberto ? [{ ...PADRAO }] : [];
      return novo;
    });
  }

  function adicionar(dia: number) {
    setH((a) => {
      const novo = completo(a);
      if (novo[String(dia)].length < 2) novo[String(dia)].push({ abre: "11:00", fecha: "14:00" });
      return novo;
    });
  }

  function remover(dia: number, idx: number) {
    setH((a) => {
      const novo = completo(a);
      novo[String(dia)].splice(idx, 1);
      return novo;
    });
  }

  function copiarParaTodos(dia: number) {
    setMsg("");
    setH((a) => {
      const base = a[String(dia)] ?? [];
      const novo: TipoHorarios = {};
      for (let d = 0; d < 7; d++) novo[String(d)] = base.map((p) => ({ ...p }));
      return novo;
    });
  }

  async function salvar() {
    setMsg("");
    const limpo = completo(h);
    for (const d of ORDEM) {
      const periodos = limpo[String(d)];
      for (const p of periodos) {
        if (!/^\d{2}:\d{2}$/.test(p.abre) || !/^\d{2}:\d{2}$/.test(p.fecha)) {
          setMsg(`${DIAS[d]}: preencha a hora de abrir e de fechar.`);
          return;
        }
        if (p.abre === p.fecha) {
          setMsg(`${DIAS[d]}: a hora de abrir e a de fechar não podem ser iguais.`);
          return;
        }
      }
      periodos.sort((x, y) => min(x.abre) - min(y.abre));
      if (periodos.length === 2) {
        const [p1, p2] = periodos;
        const p1Vira = min(p1.fecha) <= min(p1.abre);
        if (p1Vira || min(p1.fecha) > min(p2.abre)) {
          setMsg(`${DIAS[d]}: os dois períodos se sobrepõem. Ajuste os horários.`);
          return;
        }
      }
    }
    if (ligado && ORDEM.every((d) => limpo[String(d)].length === 0)) {
      setMsg("Marque pelo menos um dia como aberto, ou desligue o horário automático.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase
      .from("lojas")
      .update({ usa_horario: ligado, horarios: limpo })
      .eq("id", lojaId);
    setSalvando(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setH(limpo);
    setMsg("Salvo ✓");
    onSalvo();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Horário de funcionamento</h2>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={ligado}
          onChange={(e) => {
            setLigado(e.target.checked);
            setMsg("");
          }}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="font-medium">Abrir e fechar sozinha pelo horário</span>
          <span className="block text-sm text-gray-600">
            Fora do horário o cardápio mostra &quot;Fechado&quot; e ninguém consegue fazer pedido.
            O botão &quot;Loja aberta/fechada&quot; do topo continua valendo: se estiver
            fechada, nada entra, mesmo dentro do horário.
          </span>
        </span>
      </label>

      {ligado && (
        <ul className="space-y-3">
          {ORDEM.map((d) => {
            const periodos = h[String(d)] ?? [];
            const aberto = periodos.length > 0;
            return (
              <li key={d} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={aberto}
                      onChange={(e) => alternarDia(d, e.target.checked)}
                      className="h-4 w-4"
                    />
                    {DIAS[d]}
                  </label>
                  {aberto ? (
                    <button
                      onClick={() => copiarParaTodos(d)}
                      className="text-xs underline"
                    >
                      Copiar para todos os dias
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">Fechado</span>
                  )}
                </div>

                {periodos.map((p, i) => (
                  <div key={i} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span>das</span>
                    <input
                      type="time"
                      value={p.abre}
                      onChange={(e) => mudar(d, i, "abre", e.target.value)}
                      className={campo}
                    />
                    <span>às</span>
                    <input
                      type="time"
                      value={p.fecha}
                      onChange={(e) => mudar(d, i, "fecha", e.target.value)}
                      className={campo}
                    />
                    {periodos.length > 1 && (
                      <button
                        onClick={() => remover(d, i)}
                        aria-label="Remover período"
                        className="rounded-lg border border-red-600 px-2 py-1 text-red-600"
                      >
                        ✕
                      </button>
                    )}
                    {min(p.fecha) < min(p.abre) && (
                      <span className="text-xs text-gray-500">(fecha na madrugada do dia seguinte)</span>
                    )}
                  </div>
                ))}

                {aberto && periodos.length < 2 && (
                  <button onClick={() => adicionar(d)} className="mt-2 text-sm underline">
                    + Adicionar outro período (ex.: almoço e jantar)
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar horário"}
        </button>
        {msg && <span className="text-sm text-gray-700">{msg}</span>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  estoque: number;
  ativo: boolean;
  imagem_url: string | null;
};

type Categoria = { id: string; nome: string; produtos: Produto[] };

type Loja = {
  id: string;
  nome: string;
  telefone: string | null;
  taxa_entrega: number;
  aberta: boolean;
  aceita_pix: boolean;
  cor_principal: string;
  logo_url: string | null;
  capa_url: string | null;
  descricao: string | null;
  instagram: string | null;
  endereco_texto: string | null;
};

type Localidade = { id: string; nome: string; taxa: number };

type Endereco = {
  id: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
};

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// escolhe texto branco ou escuro conforme a cor de fundo, para sempre ler bem
function corTexto(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "#ffffff";
  const luminosidade = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminosidade > 0.6 ? "#111827" : "#ffffff";
}

export default function Cardapio({
  slug,
  loja,
  categorias,
  localidades,
}: {
  slug: string;
  loja: Loja;
  categorias: Categoria[];
  localidades: Localidade[];
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [logado, setLogado] = useState<boolean | null>(null);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [finalizando, setFinalizando] = useState(false);
  const [tipo, setTipo] = useState<"entrega" | "retirada">("entrega");
  const [enderecoId, setEnderecoId] = useState("");
  const [localidadeId, setLocalidadeId] = useState("");
  const [forma, setForma] = useState("dinheiro");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // pedido sem conta (visitante): o Supabase cria uma conta anônima só para este navegador
  const [convidado, setConvidado] = useState(false);
  const [anonimo, setAnonimo] = useState(false);
  const [aceitou, setAceitou] = useState(false);
  const [vis, setVis] = useState({
    nome: "",
    telefone: "",
    endereco: "",
  });
    // ---- Carrinho persistente (guardado neste navegador, por loja) ----
  const chaveCarrinho = `carrinho:${loja.id}`;
  const [carrinhoCarregado, setCarrinhoCarregado] = useState(false);

  // ao abrir o cardápio, recupera o carrinho guardado
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const salvo = window.localStorage.getItem(chaveCarrinho);
        if (salvo) {
          const dados = JSON.parse(salvo) as Record<string, unknown>;
          const limpo: Record<string, number> = {};
          for (const p of categorias.flatMap((c) => c.produtos)) {
            const qtd = Number(dados[p.id]);
            // descarta item que saiu do cardápio ou ficou sem estoque
            if (p.ativo && p.estoque > 0 && Number.isInteger(qtd) && qtd > 0) {
              limpo[p.id] = Math.min(qtd, p.estoque);
            }
          }
          setCarrinho(limpo);
        }
      } catch {
        /* sem armazenamento disponível: o carrinho só não é lembrado */
      }
      setCarrinhoCarregado(true);
    }, 0);
    return () => clearTimeout(t);
    // roda só ao abrir a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCarrinho]);

  // a cada mudança, guarda o carrinho
  useEffect(() => {
    if (!carrinhoCarregado) return;
    try {
      if (Object.keys(carrinho).length > 0) {
        window.localStorage.setItem(chaveCarrinho, JSON.stringify(carrinho));
      } else {
        window.localStorage.removeItem(chaveCarrinho);
      }
    } catch {
      /* sem armazenamento disponível */
    }
  }, [carrinho, carrinhoCarregado, chaveCarrinho]);


  const tema = {
    "--cor": loja.cor_principal,
    "--cor-texto": corTexto(loja.cor_principal),
  } as React.CSSProperties;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLogado(false);
        return;
      }
      setLogado(true);
      setAnonimo(!!data.user.is_anonymous);
      const { data: ends } = await supabase
        .from("enderecos")
        .select("id, rua, numero, bairro, cidade")
        .eq("cliente_id", data.user.id);
      setEnderecos(ends ?? []);
      if (ends && ends.length > 0) setEnderecoId(ends[0].id);
    });
  }, [supabase]);

  // Pré-seleciona a localidade pelo bairro (ou cidade) do endereço escolhido.
  // O cliente pode trocar a localidade na hora do pedido.
  useEffect(() => {
    if (localidades.length === 0) return;
    const e = enderecos.find((x) => x.id === enderecoId);
    if (!e) return;
    const norm = (t: string) =>
      t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const achada =
      localidades.find((l) => norm(l.nome) === norm(e.bairro)) ??
      localidades.find((l) => norm(l.nome) === norm(e.cidade));
    if (achada) setLocalidadeId(achada.id);
  }, [enderecoId, enderecos, localidades]);

  const foneLoja = loja.telefone?.replace(/\D/g, "") ?? "";
  const zapLoja = foneLoja
    ? `https://wa.me/${foneLoja.length <= 11 ? "55" + foneLoja : foneLoja}?text=${encodeURIComponent(
        `Olá, ${loja.nome}! Vim pelo cardápio online.`
      )}`
    : null;

  const todos = categorias.flatMap((c) => c.produtos);

  function alterar(produto: Produto, delta: number) {
    setCarrinho((atual) => {
      const qtd = (atual[produto.id] ?? 0) + delta;
      const nova = { ...atual };
      if (qtd <= 0) {
        delete nova[produto.id];
      } else if (qtd <= produto.estoque) {
        nova[produto.id] = qtd;
      }
      return nova;
    });
  }

  const itens = todos
    .filter((p) => carrinho[p.id])
    .map((p) => ({ ...p, quantidade: carrinho[p.id] }));

  const subtotal = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
  const totalItens = itens.reduce((soma, i) => soma + i.quantidade, 0);
  // Se a loja cadastrou localidades, a taxa vem da localidade escolhida;
  // senão vale a taxa única da loja. (O servidor recalcula de qualquer forma.)
  const temLocalidades = localidades.length > 0;
  const localidade = localidades.find((l) => l.id === localidadeId);
  const taxaBase = temLocalidades
    ? localidade?.taxa ?? 0
    : loja.taxa_entrega;
  const taxa = tipo === "entrega" && itens.length > 0 ? taxaBase : 0;
  const menorTaxa = temLocalidades
    ? Math.min(...localidades.map((l) => l.taxa))
    : loja.taxa_entrega;
  const total = subtotal + taxa;

  async function confirmar() {
    setErro("");
    const visitante = logado === false;
    if (visitante) {
      if (vis.nome.trim().length < 2) {
        setErro("Digite o seu nome.");
        return;
      }
      if (vis.telefone.replace(/\D/g, "").length < 10) {
        setErro("Digite o telefone com DDD, para a loja falar com você.");
        return;
      }
      if (tipo === "entrega" && vis.endereco.trim().length < 5) {
        setErro("Escreva o endereço de entrega (rua, número e ponto de referência).");
        return;
      }
      if (!aceitou) {
        setErro("Aceite os Termos de uso e a Política de privacidade para continuar.");
        return;
      }
    } else {
      if (tipo === "entrega" && !enderecoId) {
        setErro("Escolha um endereço de entrega.");
        return;
      }
    }
    if (tipo === "entrega" && temLocalidades && !localidadeId) {
      setErro("Escolha a localidade da entrega.");
      return;
    }
    setEnviando(true);

    let enderecoFinal = enderecoId;
    if (visitante) {
      const meta: Record<string, string> = {
        nome: vis.nome.trim(),
        telefone: vis.telefone.trim(),
      };
      if (tipo === "entrega") {
        // um campo só: o texto vai em "rua"; os demais ficam com "-" (a loja já
        // recebe a localidade escolhida e o painel esconde os "-")
        meta.rua = vis.endereco.trim();
        meta.numero = "-";
        meta.bairro = localidade?.nome ?? "-";
        meta.cidade = "-";
      }
      // o gatilho do banco cria clientes/enderecos a partir destes dados
      const { data: au, error: ea } = await supabase.auth.signInAnonymously({
        options: { data: meta },
      });
      if (ea || !au.user) {
        setErro(
          ea?.message?.toLowerCase().includes("anonymous")
            ? "Pedido sem conta indisponível no momento. Entre ou crie uma conta."
            : ea?.message ?? "Não foi possível continuar. Tente de novo."
        );
        setEnviando(false);
        return;
      }
      if (tipo === "entrega") {
        const { data: ends } = await supabase
          .from("enderecos")
          .select("id")
          .eq("cliente_id", au.user.id)
          .limit(1);
        enderecoFinal = ends?.[0]?.id ?? "";
        if (!enderecoFinal) {
          setErro("Não foi possível salvar o endereço. Tente de novo.");
          setEnviando(false);
          return;
        }
      }
      setLogado(true);
      setAnonimo(true);
    }

    const { data, error } = await supabase.rpc("criar_pedido", {
      p_loja_id: loja.id,
      p_tipo: tipo,
      p_endereco_id: tipo === "entrega" ? enderecoFinal : null,
      p_forma_pagamento: forma,
      p_observacao: obs || null,
      p_itens: itens.map((i) => ({ produto_id: i.id, quantidade: i.quantidade })),
      p_localidade_id:
        tipo === "entrega" && temLocalidades ? localidadeId : null,
    });

    if (error) {
      setErro(error.message);
      setEnviando(false);
      return;
    }
        try {
      window.localStorage.removeItem(chaveCarrinho);
    } catch {
      /* ignora */
    }
    router.push(`/pedido/${data}`);
  }

  const botaoTema =
    "bg-[var(--cor)] text-[var(--cor-texto)] disabled:opacity-40";

  return (
    <div style={tema} className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-2xl pb-72">
        {/* Capa */}
        <div className="h-40 w-full overflow-hidden bg-[var(--cor)]">
          {loja.capa_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={loja.capa_url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Cabeçalho da loja */}
        <header className="px-6">
          <div className="-mt-10">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow">
              {loja.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={loja.logo_url}
                  alt={loja.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--cor)] text-3xl font-bold text-[var(--cor-texto)]">
                  {loja.nome.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <h1 className="mt-2 break-words text-2xl font-bold leading-tight">
            {loja.nome}
          </h1>

          {loja.descricao && (
            <p className="mt-3 text-sm text-gray-600">{loja.descricao}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                loja.aberta
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {loja.aberta ? "Aberto agora" : "Fechado no momento"}
            </span>
            <span className="rounded-full bg-gray-200 px-3 py-1">
              {temLocalidades
                ? `Entrega a partir de ${dinheiro(menorTaxa)}`
                : `Entrega ${dinheiro(loja.taxa_entrega)}`}
            </span>
            {loja.instagram && (
              <a
                href={`https://instagram.com/${loja.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-gray-200 px-3 py-1 underline"
              >
                @{loja.instagram}
              </a>
            )}
          </div>

          {loja.endereco_texto && (
            <p className="mt-2 text-sm text-gray-500">{loja.endereco_texto}</p>
          )}

          {zapLoja && (
            <a
              href={zapLoja}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
            >
              💬 Falar com a loja no WhatsApp
            </a>
          )}

          {logado === false && (
            <a
              href={`/entrar?loja=${slug}`}
              className="mt-3 inline-block text-sm underline"
            >
              Entrar / Criar conta
            </a>
          )}
          {logado === true && (
            <div className="mt-3 flex items-center gap-4">
              <a href="/meus-pedidos" className="text-sm underline">
                Meus pedidos
              </a>
              <button
                onClick={async () => {
                  if (
                    anonimo &&
                    !confirm(
                      "Você pediu sem criar conta. Ao sair, não será possível ver os pedidos feitos neste aparelho. Sair mesmo?"
                    )
                  )
                    return;
                  await supabase.auth.signOut();
                  setLogado(false);
                  setAnonimo(false);
                  setConvidado(false);
                  setFinalizando(false);
                  setEnderecos([]);
                  setEnderecoId("");
                  setLocalidadeId("");
                }}
                className="text-sm underline"
              >
                Sair da conta
              </button>
            </div>
          )}
        </header>

        {/* Produtos */}
        <div className="px-6">
          {categorias.map((cat) => {
            const produtos = cat.produtos.filter((p) => p.ativo);
            if (produtos.length === 0) return null;

            return (
              <section key={cat.id} className="mt-8">
                <h2 className="mb-3 border-l-4 border-[var(--cor)] pl-3 text-xl font-semibold">
                  {cat.nome}
                </h2>
                <ul className="space-y-3">
                  {produtos.map((p) => {
                    const qtd = carrinho[p.id] ?? 0;
                    const esgotado = p.estoque <= 0;

                    return (
                      <li
                        key={p.id}
                        className={`flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                          esgotado ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {p.imagem_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imagem_url}
                              alt={p.nome}
                              className="h-20 w-20 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{p.nome}</p>
                            {p.descricao && (
                              <p className="text-sm text-gray-500">
                                {p.descricao}
                              </p>
                            )}
                            <p className="mt-1 font-semibold">
                              {dinheiro(p.preco)}
                            </p>
                          </div>
                        </div>

                        {esgotado ? (
                          <span className="text-sm font-medium text-red-600">
                            Esgotado
                          </span>
                        ) : (
                          <div className="flex items-center gap-3">
                            {qtd > 0 && (
                              <>
                                <button
                                  onClick={() => alterar(p, -1)}
                                  className="h-9 w-9 rounded-full border text-lg"
                                >
                                  −
                                </button>
                                <span className="w-4 text-center">{qtd}</span>
                              </>
                            )}
                            <button
                              onClick={() => alterar(p, 1)}
                              disabled={qtd >= p.estoque}
                              className={`h-9 w-9 rounded-full text-lg ${botaoTema}`}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 px-6 text-center text-xs text-gray-400">
          <a href="/termos" className="underline">
            Termos de uso
          </a>
          {" · "}
          <a href="/privacidade" className="underline">
            Política de privacidade
          </a>
        </footer>
      </main>

      {/* Barra do carrinho */}
      {totalItens > 0 && (
        <div className="fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto border-t bg-white p-4 shadow-lg">
          <div className="mx-auto max-w-2xl">
            {finalizando && (logado || convidado) && (
              <div className="mb-4 space-y-3 border-b pb-4">
                {logado === false && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Seus dados</p>
                    <input
                      value={vis.nome}
                      onChange={(e) => setVis({ ...vis, nome: e.target.value })}
                      placeholder="Seu nome"
                      autoComplete="name"
                      className="w-full rounded-lg border bg-white p-3 text-black"
                    />
                    <input
                      value={vis.telefone}
                      onChange={(e) => setVis({ ...vis, telefone: e.target.value })}
                      placeholder="Telefone / WhatsApp com DDD"
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full rounded-lg border bg-white p-3 text-black"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  {(["entrega", "retirada"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`flex-1 rounded-lg border py-2 ${
                        tipo === t
                          ? "bg-[var(--cor)] text-[var(--cor-texto)]"
                          : ""
                      }`}
                    >
                      {t === "entrega" ? "Entrega" : "Retirada"}
                    </button>
                  ))}
                </div>

                {tipo === "entrega" && logado === false && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Endereço de entrega</p>
                    <textarea
                      value={vis.endereco}
                      onChange={(e) => setVis({ ...vis, endereco: e.target.value })}
                      placeholder="Rua, número e ponto de referência"
                      rows={2}
                      className="w-full rounded-lg border bg-white p-3 text-black"
                    />
                  </div>
                )}

                {tipo === "entrega" && logado && (
                  <select
                    value={enderecoId}
                    onChange={(e) => setEnderecoId(e.target.value)}
                    className="w-full rounded-lg border bg-white p-3 text-black"
                  >
                    {enderecos.length === 0 && (
                      <option value="">Nenhum endereço cadastrado</option>
                    )}
                    {enderecos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.rua}, {e.numero} - {e.bairro}, {e.cidade}
                      </option>
                    ))}
                  </select>
                )}

                {tipo === "entrega" && temLocalidades && (
                  <select
                    value={localidadeId}
                    onChange={(e) => setLocalidadeId(e.target.value)}
                    className="w-full rounded-lg border bg-white p-3 text-black"
                  >
                    <option value="">Localidade da entrega...</option>
                    {localidades.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} — {dinheiro(l.taxa)}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={forma}
                  onChange={(e) => setForma(e.target.value)}
                  className="w-full rounded-lg border bg-white p-3 text-black"
                >
                  <option value="dinheiro">Dinheiro na entrega/retirada</option>
                  <option value="cartao_entrega">Cartão na entrega/retirada</option>
                  {loja.aceita_pix && (
                    <option value="pix">Pix (pagar pelo app do banco)</option>
                  )}
                </select>

                <input
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Observação (ex.: sem cebola, troco para 50)"
                  className="w-full rounded-lg border bg-white p-3 text-black"
                />

                {logado === false && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={aceitou}
                      onChange={(e) => setAceitou(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Li e aceito os{" "}
                      <a href="/termos" target="_blank" className="underline">
                        Termos de uso
                      </a>{" "}
                      e a{" "}
                      <a href="/privacidade" target="_blank" className="underline">
                        Política de privacidade
                      </a>
                      .
                    </span>
                  </label>
                )}

                {erro && <p className="text-sm text-red-600">{erro}</p>}
              </div>
            )}

            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {totalItens} {totalItens === 1 ? "item" : "itens"}
              </span>
              <span>Subtotal {dinheiro(subtotal)}</span>
            </div>
            {tipo === "entrega" && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Entrega</span>
                <span>
                  {temLocalidades && !localidade ? "escolha a localidade" : dinheiro(taxa)}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{dinheiro(total)}</span>
            </div>

            {!loja.aberta ? (
              <p className="mt-3 text-center text-sm text-red-600">
                A loja está fechada no momento.
              </p>
            ) : logado === false && convidado ? (
              <>
                <button
                  onClick={confirmar}
                  disabled={enviando}
                  className={`mt-3 w-full rounded-lg py-3 ${botaoTema}`}
                >
                  {enviando ? "Enviando..." : "Confirmar pedido"}
                </button>
                <button
                  onClick={() => router.push(`/entrar?loja=${slug}`)}
                  className="mt-2 w-full text-center text-sm underline"
                >
                  Já tenho conta: entrar
                </button>
              </>
            ) : logado === false ? (
              <>
                <button
                  onClick={() => {
                    setConvidado(true);
                    setFinalizando(true);
                  }}
                  className={`mt-3 w-full rounded-lg py-3 ${botaoTema}`}
                >
                  Pedir sem criar conta
                </button>
                <button
                  onClick={() => router.push(`/entrar?loja=${slug}`)}
                  className="mt-2 w-full rounded-lg border py-3"
                >
                  Entrar ou criar conta
                </button>
              </>
            ) : !finalizando ? (
              <button
                onClick={() => setFinalizando(true)}
                disabled={logado === null}
                className={`mt-3 w-full rounded-lg py-3 ${botaoTema}`}
              >
                Finalizar pedido
              </button>
            ) : (
              <button
                onClick={confirmar}
                disabled={enviando}
                className={`mt-3 w-full rounded-lg py-3 ${botaoTema}`}
              >
                {enviando ? "Enviando..." : "Confirmar pedido"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
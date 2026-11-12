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
}: {
  slug: string;
  loja: Loja;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [logado, setLogado] = useState<boolean | null>(null);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [finalizando, setFinalizando] = useState(false);
  const [tipo, setTipo] = useState<"entrega" | "retirada">("entrega");
  const [enderecoId, setEnderecoId] = useState("");
  const [forma, setForma] = useState("dinheiro");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

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
      const { data: ends } = await supabase
        .from("enderecos")
        .select("id, rua, numero, bairro, cidade")
        .eq("cliente_id", data.user.id);
      setEnderecos(ends ?? []);
      if (ends && ends.length > 0) setEnderecoId(ends[0].id);
    });
  }, [supabase]);

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
  const taxa = tipo === "entrega" && itens.length > 0 ? loja.taxa_entrega : 0;
  const total = subtotal + taxa;

  async function confirmar() {
    setErro("");
    if (tipo === "entrega" && !enderecoId) {
      setErro("Escolha um endereço de entrega.");
      return;
    }
    setEnviando(true);

    const { data, error } = await supabase.rpc("criar_pedido", {
      p_loja_id: loja.id,
      p_tipo: tipo,
      p_endereco_id: tipo === "entrega" ? enderecoId : null,
      p_forma_pagamento: forma,
      p_observacao: obs || null,
      p_itens: itens.map((i) => ({ produto_id: i.id, quantidade: i.quantidade })),
    });

    if (error) {
      setErro(error.message);
      setEnviando(false);
      return;
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
          <div className="-mt-10 flex items-end gap-4">
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
            <h1 className="pb-1 text-2xl font-bold leading-tight">
              {loja.nome}
            </h1>
          </div>

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
              Entrega {dinheiro(loja.taxa_entrega)}
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

          {logado === false && (
            <a
              href={`/entrar?loja=${slug}`}
              className="mt-3 inline-block text-sm underline"
            >
              Entrar / Criar conta
            </a>
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
      </main>

      {/* Barra do carrinho */}
      {totalItens > 0 && (
        <div className="fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto border-t bg-white p-4 shadow-lg">
          <div className="mx-auto max-w-2xl">
            {finalizando && logado && (
              <div className="mb-4 space-y-3 border-b pb-4">
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

                {tipo === "entrega" && (
                  <select
                    value={enderecoId}
                    onChange={(e) => setEnderecoId(e.target.value)}
                    className="w-full rounded-lg border p-3"
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

                <select
                  value={forma}
                  onChange={(e) => setForma(e.target.value)}
                  className="w-full rounded-lg border p-3"
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
                  className="w-full rounded-lg border p-3"
                />

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
                <span>{dinheiro(taxa)}</span>
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
            ) : logado === false ? (
              <button
                onClick={() => router.push(`/entrar?loja=${slug}`)}
                className={`mt-3 w-full rounded-lg py-3 ${botaoTema}`}
              >
                Entrar para finalizar
              </button>
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
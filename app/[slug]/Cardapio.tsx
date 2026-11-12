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
};

type Categoria = { id: string; nome: string; produtos: Produto[] };

type Loja = {
  id: string;
  nome: string;
  taxa_entrega: number;
  aberta: boolean;
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

  return (
    <main className="mx-auto max-w-2xl p-6 pb-72">
      <h1 className="text-3xl font-bold">{loja.nome}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {loja.aberta ? "Aberto agora" : "Fechado no momento"} · Entrega{" "}
        {dinheiro(loja.taxa_entrega)}
      </p>

      {categorias.map((cat) => {
        const produtos = cat.produtos.filter((p) => p.ativo);
        if (produtos.length === 0) return null;

        return (
          <section key={cat.id} className="mt-8">
            <h2 className="mb-3 text-xl font-semibold">{cat.nome}</h2>
            <ul className="space-y-3">
              {produtos.map((p) => {
                const qtd = carrinho[p.id] ?? 0;
                const esgotado = p.estoque <= 0;

                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{p.nome}</p>
                      {p.descricao && (
                        <p className="text-sm text-gray-500">{p.descricao}</p>
                      )}
                      <p className="mt-1 font-semibold">{dinheiro(p.preco)}</p>
                    </div>

                    {esgotado ? (
                      <span className="text-sm text-red-600">Esgotado</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        {qtd > 0 && (
                          <>
                            <button
                              onClick={() => alterar(p, -1)}
                              className="h-8 w-8 rounded-full border text-lg"
                            >
                              −
                            </button>
                            <span className="w-4 text-center">{qtd}</span>
                          </>
                        )}
                        <button
                          onClick={() => alterar(p, 1)}
                          disabled={qtd >= p.estoque}
                          className="h-8 w-8 rounded-full bg-black text-lg text-white disabled:opacity-30"
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
                        tipo === t ? "bg-black text-white" : ""
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
                className="mt-3 w-full rounded-lg bg-black py-3 text-white"
              >
                Entrar para finalizar
              </button>
            ) : !finalizando ? (
              <button
                onClick={() => setFinalizando(true)}
                disabled={logado === null}
                className="mt-3 w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
              >
                Finalizar pedido
              </button>
            ) : (
              <button
                onClick={confirmar}
                disabled={enviando}
                className="mt-3 w-full rounded-lg bg-green-700 py-3 text-white disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Confirmar pedido"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
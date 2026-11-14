"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Aparencia from "./Aparencia";
import ProdutoCard from "./ProdutoCard";
import Entrega from "./Entrega";

type Loja = {
  id: string;
  nome: string;
  slug: string;
  aberta: boolean;
  taxa_entrega: number;
  cor_principal: string;
  logo_url: string | null;
  capa_url: string | null;
  descricao: string | null;
  instagram: string | null;
  endereco_texto: string | null;
};
type Categoria = { id: string; nome: string };
type Localidade = { id: string; nome: string; taxa: number; ativo: boolean };
type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  ativo: boolean;
  categoria_id: string | null;
};
type Cliente = { nome: string; telefone: string | null };
type Pedido = {
  id: string;
  status: string;
  tipo: string;
  total: number;
  forma_pagamento: string;
  pagamento_status: string;
  observacao: string | null;
  endereco_entrega: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    complemento?: string | null;
    referencia?: string | null;
    localidade?: string | null;
  } | null;
  criado_em: string;
  clientes: Cliente | Cliente[] | null;
  itens_pedido: { nome: string; quantidade: number }[];
};

const campo = "w-full rounded-lg border p-2";

const STATUS_TXT: Record<string, string> = {
  recebido: "Novo",
  preparando: "Em preparo",
  saiu_entrega: "Saiu / pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const FORMA_TXT: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_entrega: "Cartão na entrega/retirada",
};

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function proximo(p: Pedido): { status: string; texto: string } | null {
  if (p.status === "recebido")
    return { status: "preparando", texto: "Iniciar preparo" };
  if (p.status === "preparando")
    return {
      status: "saiu_entrega",
      texto: p.tipo === "entrega" ? "Saiu para entrega" : "Pronto para retirada",
    };
  if (p.status === "saiu_entrega")
    return { status: "entregue", texto: "Marcar como entregue" };
  return null;
}

export default function Painel({
  loja,
  categorias,
  produtos,
  pedidos,
  chavePix,
  localidades,
}: {
  loja: Loja;
  categorias: Categoria[];
  produtos: Produto[];
  pedidos: Pedido[];
  chavePix: string;
  localidades: Localidade[];
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [aba, setAba] = useState<
    "pedidos" | "produtos" | "entrega" | "pagamento" | "aparencia"
  >(
    "pedidos"
  );
  const [aberta, setAberta] = useState(loja.aberta);

  // atualiza a lista de pedidos sozinho a cada 15 segundos
  useEffect(() => {
    if (aba !== "pedidos") return;
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [aba, router]);

  async function alternarLoja() {
    const nova = !aberta;
    const { error } = await supabase
      .from("lojas")
      .update({ aberta: nova })
      .eq("id", loja.id);
    if (error) {
      alert(error.message);
      return;
    }
    setAberta(nova);
  }

  async function avancar(id: string, status: string) {
    const { error } = await supabase
      .from("pedidos")
      .update({ status })
      .eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar este pedido? O estoque será devolvido.")) return;
    const { error } = await supabase.rpc("cancelar_pedido", {
      p_pedido_id: id,
    });
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  async function marcarPago(id: string) {
    if (!confirm("Confirmar que o Pix deste pedido foi recebido?")) return;
    const { error } = await supabase
      .from("pedidos")
      .update({ pagamento_status: "pago" })
      .eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/entrar?loja=admin");
    router.refresh();
  }

  const andamento = pedidos.filter(
    (p) => p.status !== "entregue" && p.status !== "cancelado"
  );
  const finalizados = pedidos.filter(
    (p) => p.status === "entregue" || p.status === "cancelado"
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{loja.nome}</h1>
          <a href={`/${loja.slug}`} className="text-sm underline">
            Ver cardápio
          </a>
        </div>
        <div className="flex gap-2">
          <button
            onClick={alternarLoja}
            className={`rounded-lg px-4 py-2 text-white ${
              aberta ? "bg-green-700" : "bg-red-700"
            }`}
          >
            {aberta ? "Loja aberta" : "Loja fechada"}
          </button>
          <button onClick={sair} className="rounded-lg border px-4 py-2">
            Sair
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["pedidos", "produtos", "entrega", "pagamento", "aparencia"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`rounded-lg border px-4 py-2 ${
              aba === a ? "bg-black text-white" : ""
            }`}
          >
            {a === "pedidos"
              ? `Pedidos (${andamento.length})`
              : a === "produtos"
              ? "Produtos"
              : a === "entrega"
              ? "Entrega"
              : a === "pagamento"
              ? "Pagamento"
              : "Aparência"}
          </button>
        ))}
      </div>

      {aba === "pedidos" && (
        <section className="mt-6 space-y-4">
          {andamento.length === 0 && (
            <p className="text-gray-500">Nenhum pedido em andamento.</p>
          )}
          {andamento.map((p) => (
            <CartaoPedido
              key={p.id}
              p={p}
              onAvancar={avancar}
              onCancelar={cancelar}
              onPagar={marcarPago}
            />
          ))}

          {finalizados.length > 0 && (
            <>
              <h2 className="pt-4 text-lg font-semibold">Finalizados</h2>
              {finalizados.map((p) => (
                <CartaoPedido
                  key={p.id}
                  p={p}
                  onAvancar={avancar}
                  onCancelar={cancelar}
                  onPagar={marcarPago}
                />
              ))}
            </>
          )}
        </section>
      )}

      {aba === "produtos" && (
        <section className="mt-6 space-y-6">
          <NovoProduto
            lojaId={loja.id}
            categorias={categorias}
            onSalvo={() => router.refresh()}
          />

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Seus produtos</h2>
            {produtos.map((p) => (
              <ProdutoCard lojaId={loja.id} key={p.id} p={p} onSalvo={() => router.refresh()} />
            ))}
          </div>
        </section>
      )}

      {aba === "entrega" && (
        <section className="mt-6">
          <Entrega
            lojaId={loja.id}
            taxaPadrao={loja.taxa_entrega}
            localidades={localidades}
            onSalvo={() => router.refresh()}
          />
        </section>
      )}

      {aba === "pagamento" && (
        <section className="mt-6">
          <ConfigPix
            lojaId={loja.id}
            chavePix={chavePix}
            onSalvo={() => router.refresh()}
          />
        </section>
      )}
            {aba === "aparencia" && (
        <section className="mt-6">
          <Aparencia loja={loja} />
        </section>
      )}
    </main>
  );
}

function CartaoPedido({
  p,
  onAvancar,
  onCancelar,
  onPagar,
}: {
  p: Pedido;
  onAvancar: (id: string, status: string) => void;
  onCancelar: (id: string) => void;
  onPagar: (id: string) => void;
}) {
  const cliente = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
  const prox = proximo(p);
  const e = p.endereco_entrega;
  const aguardaPix =
    p.forma_pagamento === "pix" &&
    p.pagamento_status === "pendente" &&
    p.status !== "cancelado";

  const fone = cliente?.telefone?.replace(/\D/g, "") ?? "";
  const linkZap = fone
    ? `https://wa.me/${fone.length <= 11 ? "55" + fone : fone}`
    : null;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="rounded bg-gray-100 px-2 py-1 text-sm font-medium">
          {STATUS_TXT[p.status] ?? p.status}
        </span>
        <span className="text-sm text-gray-500">
          {new Date(p.criado_em).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      </div>

      <p className="mt-3 font-semibold">
        {cliente?.nome ?? "Cliente"}{" "}
        {linkZap && (
          <a
            href={linkZap}
            target="_blank"
            className="ml-2 text-sm font-normal underline"
          >
            WhatsApp
          </a>
        )}
      </p>

      <ul className="mt-2 text-sm">
        {p.itens_pedido.map((i, n) => (
          <li key={n}>
            {i.quantidade}x {i.nome}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-sm text-gray-600">
        {p.tipo === "entrega" && e
          ? `Entrega${e.localidade ? " (" + e.localidade + ")" : ""}: ${e.rua}, ${e.numero} - ${e.bairro}, ${e.cidade}${
              e.complemento ? " (" + e.complemento + ")" : ""
            }${e.referencia ? " · Ref.: " + e.referencia : ""}`
          : "Retirada no local"}
      </p>

      {p.observacao && (
        <p className="mt-1 text-sm text-gray-600">Obs.: {p.observacao}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">{dinheiro(p.total)}</p>
          <p className="text-xs text-gray-500">
            {FORMA_TXT[p.forma_pagamento] ?? p.forma_pagamento}
            {p.forma_pagamento === "pix" &&
              (p.pagamento_status === "pago"
                ? " · Pago ✓"
                : " · Aguardando pagamento")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {aguardaPix && (
            <button
              onClick={() => onPagar(p.id)}
              className="rounded-lg border border-green-700 px-4 py-2 text-green-700"
            >
              Pix recebido
            </button>
          )}
          {prox && (
            <>
              <button
                onClick={() => onCancelar(p.id)}
                className="rounded-lg border border-red-600 px-4 py-2 text-red-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => onAvancar(p.id, prox.status)}
                className="rounded-lg bg-black px-4 py-2 text-white"
              >
                {prox.texto}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigPix({
  lojaId,
  chavePix,
  onSalvo,
}: {
  lojaId: string;
  chavePix: string;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [chave, setChave] = useState(chavePix);
  const [msg, setMsg] = useState("");

  async function salvar() {
    const { error } = await supabase.rpc("salvar_chave_pix", {
      p_loja_id: lojaId,
      p_chave: chave,
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(chave.trim() ? "Pix ativado ✓" : "Pix desativado ✓");
    onSalvo();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Receber por Pix</h2>
      <p className="text-sm text-gray-600">
        Digite a chave Pix da loja (CPF/CNPJ, telefone, e-mail ou chave
        aleatória). Ela só aparece para o cliente que fizer um pedido com Pix.
        Deixe em branco para desativar o Pix.
      </p>
      <input
        value={chave}
        onChange={(e) => setChave(e.target.value)}
        placeholder="Chave Pix"
        className={campo}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Salvar
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

function LinhaProduto({
  p,
  onSalvo,
}: {
  p: Produto;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [preco, setPreco] = useState(String(p.preco));
  const [estoque, setEstoque] = useState(String(p.estoque));
  const [ativo, setAtivo] = useState(p.ativo);
  const [msg, setMsg] = useState("");

  async function salvar() {
    const precoNum = Number(preco.replace(",", "."));
    const estoqueNum = parseInt(estoque, 10);
    if (!(precoNum >= 0) || !(estoqueNum >= 0)) {
      setMsg("Valores inválidos.");
      return;
    }
    const { error } = await supabase
      .from("produtos")
      .update({ preco: precoNum, estoque: estoqueNum, ativo })
      .eq("id", p.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Salvo ✓");
    onSalvo();
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="font-medium">{p.nome}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm">
          Preço (R$)
          <input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            inputMode="decimal"
            className={campo}
          />
        </label>
        <label className="text-sm">
          Estoque
          <input
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
            inputMode="numeric"
            className={campo}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Aparece no cardápio
        </label>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
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

function NovoProduto({
  lojaId,
  categorias,
  onSalvo,
}: {
  lojaId: string;
  categorias: Categoria[];
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [msg, setMsg] = useState("");

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const precoNum = Number(String(f.get("preco")).replace(",", "."));
    const estoqueNum = parseInt(String(f.get("estoque")), 10);

    if (!(precoNum >= 0) || !(estoqueNum >= 0)) {
      setMsg("Preço ou estoque inválido.");
      return;
    }

    const { error } = await supabase.from("produtos").insert({
      loja_id: lojaId,
      categoria_id: String(f.get("categoria")) || null,
      nome: String(f.get("nome")),
      descricao: String(f.get("descricao")) || null,
      preco: precoNum,
      estoque: estoqueNum,
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    form.reset();
    setMsg("Produto adicionado ✓");
    onSalvo();
  }

  return (
    <form onSubmit={criar} className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Novo produto</h2>
      <input name="nome" placeholder="Nome" required className={campo} />
      <input name="descricao" placeholder="Descrição (opcional)" className={campo} />
      <div className="grid grid-cols-2 gap-3">
        <input name="preco" placeholder="Preço (ex.: 15,90)" required className={campo} />
        <input name="estoque" placeholder="Estoque" required className={campo} />
      </div>
      <select name="categoria" className={campo}>
        <option value="">Sem categoria</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
          Adicionar
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </form>
  );
}
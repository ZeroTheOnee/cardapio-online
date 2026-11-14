import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CopiarPix from "./CopiarPix";
import LinhaDoTempo from "./LinhaDoTempo";
import AtualizarSozinho from "./AtualizarSozinho";

type Item = { nome: string; preco_unitario: number; quantidade: number };

const FORMA: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro na entrega/retirada",
  cartao_entrega: "Cartão na entrega/retirada",
};

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function Pedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select(
      "id, status, tipo, criado_em, subtotal, taxa_entrega, total, forma_pagamento, pagamento_status, itens_pedido(nome, preco_unitario, quantidade), lojas(nome, slug, telefone)"
    )
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  const itens = pedido.itens_pedido as Item[];
  const lojaRel = Array.isArray(pedido.lojas) ? pedido.lojas[0] : pedido.lojas;
  const loja = lojaRel as {
    nome: string;
    slug: string;
    telefone: string | null;
  } | null;

  const emAndamento =
    pedido.status !== "entregue" && pedido.status !== "cancelado";

  const mostrarPix =
    pedido.forma_pagamento === "pix" &&
    pedido.pagamento_status === "pendente" &&
    pedido.status !== "cancelado";

  let chavePix: string | null = null;
  if (mostrarPix) {
    const { data } = await supabase.rpc("chave_pix_do_pedido", {
      p_pedido_id: pedido.id,
    });
    chavePix = (data as string | null) ?? null;
  }

  const fone = loja?.telefone?.replace(/\D/g, "") ?? "";
  const linkZap = fone
    ? `https://wa.me/${fone.length <= 11 ? "55" + fone : fone}?text=${encodeURIComponent(
        `Olá! Fiz o pedido ${pedido.id.slice(0, 8)} e paguei o Pix de ${dinheiro(
          pedido.total
        )}. Segue o comprovante:`
      )}`
    : null;

  return (
    <main className="mx-auto max-w-md p-6">
      <AtualizarSozinho ativo={emAndamento} />

      <h1 className="text-2xl font-bold">
        {pedido.status === "entregue"
          ? "Pedido concluído ✅"
          : pedido.status === "cancelado"
          ? "Pedido cancelado"
          : "Pedido enviado! ✅"}
      </h1>
      {loja && <p className="mt-1 text-gray-500">{loja.nome}</p>}
      <p className="text-sm text-gray-400">
        Pedido {pedido.id.slice(0, 8)} ·{" "}
        {new Date(pedido.criado_em).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>

      <LinhaDoTempo status={pedido.status} tipo={pedido.tipo} />
      {emAndamento && (
        <p className="mt-2 text-xs text-gray-400">
          Esta página se atualiza sozinha.
        </p>
      )}

      {pedido.forma_pagamento === "pix" &&
        pedido.pagamento_status === "pago" && (
          <p className="mt-3 rounded-lg bg-green-100 p-3 text-green-800">
            Pagamento confirmado ✓
          </p>
        )}

      {mostrarPix && (
        <div className="mt-4 rounded-lg border p-4">
          <p className="font-semibold">Pague com Pix</p>
          <p className="mt-1 text-sm text-gray-600">
            Valor: <strong>{dinheiro(pedido.total)}</strong>
          </p>

          {chavePix ? (
            <>
              <p className="mt-3 break-all rounded bg-gray-100 p-3 font-mono text-sm">
                {chavePix}
              </p>
              <CopiarPix chave={chavePix} />
            </>
          ) : (
            <p className="mt-3 text-sm text-red-600">
              Chave Pix indisponível. Fale com a loja.
            </p>
          )}

          <p className="mt-3 text-sm text-gray-600">
            Depois de pagar, envie o comprovante para a loja. O pagamento será
            confirmado quando ela receber.
          </p>

          {linkZap && (
            <a
              href={linkZap}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg bg-green-700 px-4 py-2 text-white"
            >
              Enviar comprovante no WhatsApp
            </a>
          )}
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {itens.map((i, n) => (
          <li key={n} className="flex justify-between">
            <span>
              {i.quantidade}x {i.nome}
            </span>
            <span>{dinheiro(i.preco_unitario * i.quantidade)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{dinheiro(pedido.subtotal)}</span>
        </div>
        {pedido.tipo === "entrega" && (
          <div className="flex justify-between">
            <span>Entrega</span>
            <span>{dinheiro(pedido.taxa_entrega)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{dinheiro(pedido.total)}</span>
        </div>
        <p className="text-gray-500">
          Pagamento: {FORMA[pedido.forma_pagamento] ?? pedido.forma_pagamento}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        {loja && (
          <Link href={`/${loja.slug}`} className="underline">
            Voltar ao cardápio
          </Link>
        )}
        <Link href="/meus-pedidos" className="underline">
          Meus pedidos
        </Link>
      </div>
    </main>
  );
}
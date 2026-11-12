import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Item = { nome: string; preco_unitario: number; quantidade: number };

const STATUS: Record<string, string> = {
  recebido: "Pedido recebido",
  preparando: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
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
      "id, status, tipo, subtotal, taxa_entrega, total, forma_pagamento, itens_pedido(nome, preco_unitario, quantidade), lojas(nome, slug)"
    )
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  const itens = pedido.itens_pedido as Item[];
  const lojaRel = Array.isArray(pedido.lojas) ? pedido.lojas[0] : pedido.lojas;
  const loja = lojaRel as { nome: string; slug: string } | null;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Pedido enviado! ✅</h1>
      {loja && <p className="mt-1 text-gray-500">{loja.nome}</p>}
      <p className="mt-4 rounded-lg bg-gray-100 p-3 font-medium">
        {STATUS[pedido.status] ?? pedido.status}
      </p>

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
      </div>

      {loja && (
        <Link href={`/${loja.slug}`} className="mt-6 inline-block underline">
          Voltar ao cardápio
        </Link>
      )}
    </main>
  );
}
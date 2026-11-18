import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { enviarAvisos, SITE } from "@/lib/avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function segredoOk(recebido: string | null) {
  const esperado = process.env.WEBHOOK_SECRET;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

const dinheiro = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Chamada pelo Database Webhook do Supabase quando entra um pedido novo.
export async function POST(req: Request) {
  if (!segredoOk(req.headers.get("x-webhook-secret"))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    return NextResponse.json({ erro: "servidor sem configuração" }, { status: 500 });
  }
  const admin = createClient(url, chave, { auth: { persistSession: false } });

  const corpo = await req.json().catch(() => null);
  const pedido = corpo?.record;
  if (corpo?.type !== "INSERT" || !pedido?.id || !pedido?.loja_id) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const [{ data: itens }, { data: cliente }] = await Promise.all([
    admin.from("itens_pedido").select("nome, quantidade, opcoes").eq("pedido_id", pedido.id),
    admin.from("clientes").select("nome").eq("id", pedido.cliente_id).maybeSingle(),
  ]);

  const lista = (itens ?? [])
    .map((i) => {
      const ops = (i.opcoes as { nome: string }[] | null) ?? [];
      return `${i.quantidade}x ${i.nome}${ops.length ? " (" + ops.map((o) => o.nome).join(", ") + ")" : ""}`;
    })
    .join(", ");
  const forma =
    pedido.forma_pagamento === "pix"
      ? "Pix"
      : pedido.forma_pagamento === "cartao_entrega"
      ? "Cartão"
      : "Dinheiro";
  const tipo = pedido.tipo === "entrega" ? "Entrega" : "Retirada";

  const resultado = await enviarAvisos(admin, pedido.loja_id, {
    titulo: `🔔 Novo pedido! #${String(pedido.id).slice(0, 8)}`,
    texto: `${cliente?.nome ?? "Cliente"} · ${lista || "sem itens"}\n${dinheiro(
      pedido.total
    )} · ${tipo} · ${forma}`,
    url: `${SITE}/admin`,
  });

  return NextResponse.json({ ok: true, ...resultado });
}

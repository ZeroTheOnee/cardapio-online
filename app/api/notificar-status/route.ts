import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { enviarAvisoPedido, SITE, type Aviso } from "@/lib/avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function segredoOk(recebido: string | null) {
  const esperado = process.env.WEBHOOK_SECRET;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Chamada pelo Database Webhook do Supabase (pedidos, UPDATE): avisa o CLIENTE
// quando o status do pedido muda ou o Pix é confirmado.
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
  const novo = corpo?.record;
  const antigo = corpo?.old_record;
  if (corpo?.type !== "UPDATE" || !novo?.id || !antigo) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const { data: loja } = await admin
    .from("lojas")
    .select("nome, slug")
    .eq("id", novo.loja_id)
    .maybeSingle();
  const nomeLoja = loja?.nome ?? "A loja";
  const retirada = novo.tipo === "retirada";

  let texto: { titulo: string; texto: string } | null = null;
  if (novo.status !== antigo.status) {
    switch (novo.status) {
      case "preparando":
        texto = {
          titulo: "👩‍🍳 Pedido em preparo",
          texto: `${nomeLoja} começou a preparar o seu pedido.`,
        };
        break;
      case "saiu_entrega":
        texto = retirada
          ? { titulo: "✅ Pronto para retirar!", texto: `Seu pedido na ${nomeLoja} já pode ser retirado.` }
          : { titulo: "🛵 Pedido a caminho!", texto: `Seu pedido da ${nomeLoja} saiu para entrega.` };
        break;
      case "entregue":
        texto = {
          titulo: retirada ? "🎉 Pedido retirado" : "🎉 Pedido entregue",
          texto: `Bom apetite! Obrigado por pedir na ${nomeLoja}.`,
        };
        break;
      case "cancelado":
        texto = {
          titulo: "❌ Pedido cancelado",
          texto: `${nomeLoja} cancelou o seu pedido. Fale com a loja se precisar.`,
        };
        break;
    }
  } else if (novo.pagamento_status === "pago" && antigo.pagamento_status !== "pago") {
    texto = {
      titulo: "💚 Pagamento confirmado",
      texto: `${nomeLoja} recebeu o seu Pix.`,
    };
  }
  if (!texto) return NextResponse.json({ ok: true, ignorado: true });

  const aviso: Aviso = {
    ...texto,
    url: `${SITE}/pedido/${novo.id}`,
    icon: loja?.slug ? `${SITE}/${loja.slug}/icone/192` : undefined,
    tag: `pedido-${novo.id}`,
    fixa: false,
  };
  const resultado = await enviarAvisoPedido(admin, novo.id, aviso);

  // pedido encerrado: não precisa mais guardar as inscrições
  if (novo.status === "entregue" || novo.status === "cancelado") {
    await admin.from("push_pedidos").delete().eq("pedido_id", novo.id);
  }
  return NextResponse.json({ ok: true, ...resultado });
}

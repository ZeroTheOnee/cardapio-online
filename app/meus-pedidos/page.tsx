import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AtualizarSozinho from "../pedido/[id]/AtualizarSozinho";

type Item = { nome: string; quantidade: number };
type LojaRel = { nome: string; slug: string };

const STATUS: Record<string, { texto: string; cor: string }> = {
  recebido: { texto: "Pedido recebido", cor: "bg-blue-100 text-blue-800" },
  preparando: { texto: "Em preparo", cor: "bg-yellow-100 text-yellow-800" },
  saiu_entrega: { texto: "Saiu / pronto", cor: "bg-purple-100 text-purple-800" },
  entregue: { texto: "Entregue", cor: "bg-green-100 text-green-800" },
  cancelado: { texto: "Cancelado", cor: "bg-red-100 text-red-800" },
};

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function MeusPedidos() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-bold">Meus pedidos</h1>
        <p className="mt-3 text-gray-600">
          Entre na sua conta para ver seus pedidos.
        </p>
        <Link href="/entrar" className="mt-4 inline-block underline">
          Entrar
        </Link>
      </main>
    );
  }

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, status, tipo, total, criado_em, itens_pedido(nome, quantidade), lojas(nome, slug)"
    )
    .eq("cliente_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(50);

  const lista = pedidos ?? [];
  const algumEmAndamento = lista.some(
    (p) => p.status !== "entregue" && p.status !== "cancelado"
  );

  return (
    <main className="mx-auto max-w-md p-6">
      <AtualizarSozinho ativo={algumEmAndamento} segundos={15} />
      <h1 className="text-2xl font-bold">Meus pedidos</h1>

      {lista.length === 0 && (
        <p className="mt-4 text-gray-500">Você ainda não fez nenhum pedido.</p>
      )}

      <ul className="mt-4 space-y-3">
        {lista.map((p) => {
          const loja = (Array.isArray(p.lojas) ? p.lojas[0] : p.lojas) as
            | LojaRel
            | null;
          const itens = p.itens_pedido as Item[];
          const st = STATUS[p.status] ?? {
            texto: p.status,
            cor: "bg-gray-100 text-gray-800",
          };
          const resumo = itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ");

          return (
            <li key={p.id}>
              <Link
                href={`/pedido/${p.id}`}
                className="block rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{loja?.nome ?? "Loja"}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${st.cor}`}
                  >
                    {st.texto}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(p.criado_em).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {" · "}
                  {p.tipo === "entrega" ? "Entrega" : "Retirada"}
                </p>
                <p className="mt-2 text-sm text-gray-700">{resumo}</p>
                <p className="mt-2 font-bold">{dinheiro(p.total)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

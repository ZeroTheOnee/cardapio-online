import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Painel from "./Painel";

export default async function Admin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?loja=admin");

  const { data: loja } = await supabase
    .from("lojas")
    .select(
        "id, nome, slug, aberta, taxa_entrega, cor_principal, logo_url, capa_url, descricao, instagram, endereco_texto"
      )
    .eq("dono_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!loja) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-bold">Nenhuma loja encontrada</h1>
        <p className="mt-3 text-gray-600">
          Esta conta não é dona de nenhuma loja. Entre com o e-mail que você
          usou para criar a loja.
        </p>
        <a href="/entrar?loja=admin" className="mt-4 inline-block underline">
          Entrar com outra conta
        </a>
      </main>
    );
  }

  const [
    { data: categorias },
    { data: produtos },
    { data: pedidos },
    { data: pagamento },
    { data: localidades },
  ] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nome")
      .eq("loja_id", loja.id)
      .order("ordem"),
    supabase
      .from("produtos")
      .select("id, nome, preco, estoque, ativo, categoria_id")
      .eq("loja_id", loja.id)
      .order("nome"),
    supabase
      .from("pedidos")
      .select(
        "id, status, tipo, total, forma_pagamento, pagamento_status, observacao, endereco_entrega, criado_em, clientes(nome, telefone), itens_pedido(nome, quantidade)"
      )
      .eq("loja_id", loja.id)
      .order("criado_em", { ascending: false })
      .limit(50),
    supabase
      .from("lojas_pagamento")
      .select("chave_pix")
      .eq("loja_id", loja.id)
      .maybeSingle(),
    supabase
      .from("localidades")
      .select("id, nome, taxa, ativo")
      .eq("loja_id", loja.id)
      .order("nome"),
  ]);

  return (
    <Painel
      loja={loja}
      categorias={categorias ?? []}
      produtos={produtos ?? []}
      pedidos={pedidos ?? []}
      chavePix={pagamento?.chave_pix ?? ""}
      localidades={localidades ?? []}
    />
  );
}
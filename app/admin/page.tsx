import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Painel from "./Painel";

export default async function Admin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?loja=admin");

  const { data: loja, error: erroLoja } = await supabase
    .from("lojas")
    .select(
        "id, nome, slug, aberta, usa_horario, horarios, fuso, telefone, nome_pix, taxa_entrega, cor_principal, logo_url, capa_url, descricao, instagram, endereco_texto"
      )
    .eq("dono_id", user.id)
    .limit(1)
    .maybeSingle();

  // erro de verdade (ex.: coluna que falta no banco) não pode parecer "conta sem loja"
  if (erroLoja) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-bold">Não foi possível carregar a loja</h1>
        <p className="mt-3 text-gray-600">
          Houve um erro ao ler os dados da loja. Se você acabou de atualizar o sistema,
          confira se todos os arquivos .sql de atualização foram executados no Supabase.
        </p>
        <p className="mt-3 rounded-lg bg-gray-100 p-3 text-sm text-gray-800">
          {erroLoja.message}
        </p>
      </main>
    );
  }

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
    { data: gruposBrutos },
    { data: vinculos },
  ] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nome, ordem")
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
        "id, status, tipo, total, forma_pagamento, pagamento_status, observacao, endereco_entrega, criado_em, clientes(nome, telefone), itens_pedido(nome, quantidade, opcoes)"
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
    supabase
      .from("grupos_opcao")
      .select("id, nome, minimo, maximo, ordem, opcoes(id, nome, preco_extra, ativo, ordem)")
      .eq("loja_id", loja.id)
      .order("ordem"),
    supabase
      .from("produto_grupos")
      .select("produto_id, grupo_id")
      .eq("loja_id", loja.id),
  ]);

  // opções de cada grupo na ordem escolhida pelo dono
  const grupos = (gruposBrutos ?? []).map((g) => ({
    ...g,
    opcoes: [...(g.opcoes ?? [])].sort((a, b) => a.ordem - b.ordem),
  }));

  return (
    <Painel
      loja={loja}
      categorias={categorias ?? []}
      produtos={produtos ?? []}
      pedidos={pedidos ?? []}
      chavePix={pagamento?.chave_pix ?? ""}
      localidades={localidades ?? []}
      grupos={grupos}
      vinculos={vinculos ?? []}
    />
  );
}
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Cardapio from "./Cardapio";

export default async function Pagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: loja } = await supabase
    .from("lojas")
    .select(
      "id, nome, telefone, taxa_entrega, aberta, aceita_pix, cor_principal, logo_url, capa_url, descricao, instagram, endereco_texto"
    )
    .eq("slug", slug)
    .single();

  if (!loja) notFound();

  const { data: categorias } = await supabase
    .from("categorias")
    .select(
      "id, nome, produtos(id, nome, descricao, preco, estoque, ativo, imagem_url, produto_grupos(grupos_opcao(id, nome, minimo, maximo, ordem, opcoes(id, nome, preco_extra, ativo, ordem))))"
    )
    .eq("loja_id", loja.id)
    .order("ordem");

  // O banco devolve produto_grupos -> grupos_opcao; o cardápio espera grupos_opcao direto no produto.
  type Rel = { grupos_opcao: unknown };
  const categoriasComGrupos = (categorias ?? []).map((c) => ({
    ...c,
    produtos: (c.produtos ?? []).map((p) => {
      const { produto_grupos, ...resto } = p;
      const grupos = ((produto_grupos ?? []) as Rel[]).flatMap((pg) =>
        Array.isArray(pg.grupos_opcao) ? pg.grupos_opcao : pg.grupos_opcao ? [pg.grupos_opcao] : []
      );
      return { ...resto, grupos_opcao: grupos };
    }),
  }));

  const { data: localidades } = await supabase
    .from("localidades")
    .select("id, nome, taxa")
    .eq("loja_id", loja.id)
    .eq("ativo", true)
    .order("nome");

  return (
    <Cardapio
      slug={slug}
      loja={loja}
      categorias={categoriasComGrupos}
      localidades={localidades ?? []}
    />
  );
}
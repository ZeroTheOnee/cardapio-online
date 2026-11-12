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
    .select("id, nome, taxa_entrega, aberta")
    .eq("slug", slug)
    .single();

  if (!loja) notFound();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome, produtos(id, nome, descricao, preco, estoque, ativo)")
    .eq("loja_id", loja.id)
    .order("ordem");

  return <Cardapio slug={slug} loja={loja} categorias={categorias ?? []} />;
}
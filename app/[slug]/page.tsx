import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata, Viewport } from "next";
import { buscarLojaMeta, corSegura, SITE } from "@/lib/loja-meta";
import Cardapio from "./Cardapio";

// Prévia do link (WhatsApp, Instagram...), ícone e manifesto do app instalável de cada loja
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loja = await buscarLojaMeta(slug);
  if (!loja) return { title: "Loja não encontrada" };

  const descricao =
    loja.descricao?.slice(0, 160) || `Cardápio online de ${loja.nome}. Faça seu pedido pelo celular.`;
  const imagens = [loja.capa_url || loja.logo_url || `/${slug}/icone/512`];

  return {
    metadataBase: new URL(SITE),
    title: loja.nome,
    description: descricao,
    manifest: `/${slug}/manifest.webmanifest`,
    icons: {
      icon: [{ url: `/${slug}/icone/192`, sizes: "192x192", type: "image/png" }],
      apple: [{ url: `/${slug}/icone/180`, sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: { capable: true, title: loja.nome.slice(0, 20), statusBarStyle: "default" },
    openGraph: {
      type: "website",
      siteName: "PedeEasy",
      locale: "pt_BR",
      url: `/${slug}`,
      title: loja.nome,
      description: descricao,
      images: imagens,
    },
    twitter: {
      card: loja.capa_url ? "summary_large_image" : "summary",
      title: loja.nome,
      description: descricao,
      images: imagens,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const loja = await buscarLojaMeta(slug);
  return { themeColor: corSegura(loja?.cor_principal) };
}

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
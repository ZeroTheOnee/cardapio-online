import { buscarLojaMeta, corSegura } from "@/lib/loja-meta";

// Manifesto do app INSTALÁVEL de cada loja: /<slug>/manifest.webmanifest
// Sem "scope": o app instalado cobre o site todo, assim /pedido, /entrar e
// /meus-pedidos abrem dentro do app (e não no navegador).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const loja = await buscarLojaMeta(slug);
  if (!loja) return new Response("Loja não encontrada", { status: 404 });

  const cor = corSegura(loja.cor_principal);
  const manifesto = {
    id: `/${slug}`,
    name: loja.nome,
    short_name: loja.nome.length > 12 ? loja.nome.slice(0, 12).trim() : loja.nome,
    description: loja.descricao?.slice(0, 160) || `Cardápio online de ${loja.nome}`,
    start_url: `/${slug}`,
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#ffffff",
    theme_color: cor,
    icons: [
      { src: `/${slug}/icone/192`, sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: `/${slug}/icone/512`, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };

  return new Response(JSON.stringify(manifesto), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

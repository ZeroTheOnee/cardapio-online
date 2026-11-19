import { ImageResponse } from "next/og";
import { buscarLojaMeta, corSegura, textoSobre } from "@/lib/loja-meta";

const TAMANHOS = [96, 180, 192, 512];

// Só aceita imagem do Storage do próprio projeto (o endereço vem do dono da loja).
async function logoComoDataUrl(url: string | null): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !base || !url.startsWith(`${base}/storage/v1/object/public/`)) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !/^image\/(jpeg|png)/.test(tipo)) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) return null;
    return `data:${tipo.split(";")[0]};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

// Ícone PNG quadrado da loja: logo sobre a cor da loja (ou a inicial do nome).
// A margem deixa o ícone seguro para o recorte redondo do Android ("maskable").
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; tamanho: string }> }
) {
  const { slug, tamanho } = await params;
  const t = Number(tamanho);
  if (!TAMANHOS.includes(t)) return new Response("Tamanho inválido", { status: 404 });

  const loja = await buscarLojaMeta(slug);
  if (!loja) return new Response("Loja não encontrada", { status: 404 });

  const cor = corSegura(loja.cor_principal);
  const logo = await logoComoDataUrl(loja.logo_url);
  const caixa = Math.round(t * 0.58);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: cor,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            width={caixa}
            height={caixa}
            alt=""
            style={{ borderRadius: Math.round(caixa * 0.22), objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: Math.round(t * 0.5),
              fontWeight: 700,
              color: textoSobre(cor),
            }}
          >
            {loja.nome.trim().charAt(0).toUpperCase() || "P"}
          </div>
        )}
      </div>
    ),
    {
      width: t,
      height: t,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    }
  );
}

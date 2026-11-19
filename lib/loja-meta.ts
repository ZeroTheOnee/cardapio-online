// Dados públicos mínimos da loja usados no PWA e na prévia do link (servidor).
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pedeeasy.com.br";

export const buscarLojaMeta = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lojas")
    .select("nome, descricao, cor_principal, logo_url, capa_url")
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

// aceita só #RRGGBB; qualquer outra coisa cai na cor padrão
export function corSegura(cor: string | null | undefined) {
  return cor && /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : "#111827";
}

// texto claro ou escuro, conforme a cor de fundo
export function textoSobre(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
}

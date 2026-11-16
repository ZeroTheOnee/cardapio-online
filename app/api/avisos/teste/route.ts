import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { enviarAvisos, SITE } from "@/lib/avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O dono logado manda um aviso de teste para a PRÓPRIA loja.
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !chave) {
    return NextResponse.json({ erro: "servidor sem configuração" }, { status: 500 });
  }

  const jar = await cookies();
  const usuario = createServerClient(url, anon, {
    cookies: { getAll: () => jar.getAll(), setAll: () => {} },
  });
  const { data: u } = await usuario.auth.getUser();
  if (!u.user) return NextResponse.json({ erro: "faça login" }, { status: 401 });

  // RLS garante que só aparece a loja do próprio usuário
  const { data: loja } = await usuario
    .from("lojas")
    .select("id")
    .eq("dono_id", u.user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return NextResponse.json({ erro: "loja não encontrada" }, { status: 404 });

  const admin = createClient(url, chave, { auth: { persistSession: false } });
  const r = await enviarAvisos(admin, loja.id, {
    titulo: "🔔 Aviso de teste",
    texto: "Se você viu isto, os avisos do PedeEasy estão funcionando.",
    url: `${SITE}/admin`,
  });
  return NextResponse.json({ ok: true, ...r });
}

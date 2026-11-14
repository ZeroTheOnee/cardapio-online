import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Recebe o link do e-mail de CONFIRMAÇÃO DE CADASTRO do cliente.
// O Supabase já confirma o e-mail antes de chegar aqui; esta rota só tenta
// abrir a sessão. Se o link foi aberto em outro navegador/aparelho, a sessão
// não abre, e a pessoa é levada ao login com o aviso "e-mail confirmado".
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const lojaParam = searchParams.get("loja") ?? "";
  // só aceita slug simples, para ninguém usar este link para redirecionar a outro site
  const loja = /^[a-z0-9-]{1,60}$/.test(lojaParam) ? lojaParam : "";

  const supabase = await createClient();

  let ok = false;
  if (token_hash && type === "signup") {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) {
    return NextResponse.redirect(`${origin}${loja ? "/" + loja : "/"}`);
  }
  return NextResponse.redirect(
    `${origin}/entrar?confirmado=1${loja ? "&loja=" + loja : ""}`
  );
}

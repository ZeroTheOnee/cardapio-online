import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Recebe o link do e-mail de recuperação de senha, valida no servidor
// e leva a pessoa para a tela de nova senha.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  // Link do modelo personalizado (funciona em qualquer navegador)
  if (token_hash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}/redefinir-senha`);
    }
  }

  // Link do modelo padrão do Supabase
  // (só funciona no mesmo navegador em que o pedido foi feito)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/redefinir-senha`);
    }
  }

  return NextResponse.redirect(`${origin}/esqueci-senha?erro=link`);
}
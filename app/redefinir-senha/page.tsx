import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormNovaSenha from "./FormNovaSenha";

export default async function RedefinirSenha() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // sem sessão de recuperação, volta para pedir um novo link
  if (!user) redirect("/esqueci-senha?erro=link");

  return <FormNovaSenha />;
}
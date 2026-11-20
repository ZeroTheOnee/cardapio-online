import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListaEnderecos from "./ListaEnderecos";

export default async function MeusEnderecos() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-bold">Meus endereços</h1>
        <p className="mt-3 text-gray-600">Entre na sua conta para ver seus endereços.</p>
        <Link href="/entrar" className="mt-4 inline-block underline">
          Entrar
        </Link>
      </main>
    );
  }

  const { data } = await supabase
    .from("enderecos")
    .select("id, rua, numero, bairro, cidade, complemento, referencia")
    .eq("cliente_id", user.id);

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus endereços</h1>
        <Link href="/meus-pedidos" className="text-sm underline">
          Meus pedidos
        </Link>
      </div>
      <ListaEnderecos inicial={data ?? []} />
    </main>
  );
}

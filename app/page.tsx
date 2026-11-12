import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lojas").select("id");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Cardápio Online</h1>
      {error ? (
        <p className="mt-4 text-red-600">Erro: {error.message}</p>
      ) : (
        <p className="mt-4 text-green-700">
          Conectado! Lojas cadastradas: {data.length}
        </p>
      )}
    </main>
  );
}
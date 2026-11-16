"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Encerra a sessão do cliente e volta para a página indicada.
export default function BotaoSair({ destino = "/" }: { destino?: string }) {
  const [supabase] = useState(() => createClient());

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = destino;
  }

  return (
    <button onClick={sair} className="text-sm underline">
      Sair da conta
    </button>
  );
}

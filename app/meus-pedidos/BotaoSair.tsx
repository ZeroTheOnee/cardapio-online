"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Encerra a sessão do cliente e volta para a página indicada.
export default function BotaoSair({ destino = "/" }: { destino?: string }) {
  const [supabase] = useState(() => createClient());

  async function sair() {
    const { data } = await supabase.auth.getUser();
    if (
      data.user?.is_anonymous &&
      !confirm(
        "Você pediu sem criar conta. Ao sair, não será possível ver os pedidos feitos neste aparelho. Sair mesmo?"
      )
    )
      return;
    await supabase.auth.signOut();
    window.location.href = destino;
  }

  return (
    <button onClick={sair} className="text-sm underline">
      Sair da conta
    </button>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Pede ao servidor os dados novos do pedido a cada poucos segundos,
// sem recarregar a página. Só roda enquanto o pedido está em andamento.
export default function AtualizarSozinho({
  ativo,
  segundos = 10,
}: {
  ativo: boolean;
  segundos?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!ativo) return;

    const atualizar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const t = setInterval(atualizar, segundos * 1000);
    // ao voltar para a aba/aplicativo, atualiza na hora
    document.addEventListener("visibilitychange", atualizar);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [ativo, segundos, router]);

  return null;
}

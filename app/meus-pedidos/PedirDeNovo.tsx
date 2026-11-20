"use client";

import { useRouter } from "next/navigation";

export type ItemRepetir = {
  produto_id: string | null;
  quantidade: number;
  opcoes: { grupo: string; nome: string }[];
};

// Guarda os itens do pedido antigo neste navegador e abre o cardápio da loja.
// O cardápio confere o que ainda existe (produto, estoque, opções) e monta o carrinho.
export default function PedirDeNovo({
  slug,
  lojaId,
  itens,
}: {
  slug: string;
  lojaId: string;
  itens: ItemRepetir[];
}) {
  const router = useRouter();

  function repetir() {
    try {
      const lista = itens
        .filter((i) => i.produto_id)
        .map((i) => ({
          produto_id: i.produto_id,
          qtd: i.quantidade,
          opcoes: Array.isArray(i.opcoes) ? i.opcoes : [],
        }));
      window.localStorage.setItem(`repetir:${lojaId}`, JSON.stringify(lista));
    } catch {
      /* sem armazenamento: abre o cardápio sem os itens */
    }
    router.push(`/${slug}`);
  }

  return (
    <button
      onClick={repetir}
      className="w-full rounded-lg border border-gray-400 py-2 text-sm font-medium"
    >
      🔁 Pedir de novo
    </button>
  );
}

"use client";

import { useState } from "react";

export default function CopiarPix({
  texto,
  rotulo = "Copiar chave Pix",
  destaque = false,
}: {
  texto: string;
  rotulo?: string;
  destaque?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <button
      onClick={copiar}
      className={
        destaque
          ? "mt-3 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white"
          : "mt-3 w-full rounded-lg border border-gray-400 px-4 py-2.5 font-medium"
      }
    >
      {copiado ? "Copiado ✓" : rotulo}
    </button>
  );
}

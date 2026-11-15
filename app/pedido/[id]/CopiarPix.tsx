"use client";

import { useState } from "react";

export default function CopiarPix({ chave }: { chave: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert("Não foi possível copiar. Selecione a chave e copie manualmente.");
    }
  }

  return (
    <button
      onClick={copiar}
      className="mt-3 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white"
    >
      {copiado ? "Copiado ✓" : "Copiar chave Pix"}
    </button>
  );
}
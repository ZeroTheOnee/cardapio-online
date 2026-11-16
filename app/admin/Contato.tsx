"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border bg-white p-2 text-black";

// WhatsApp da loja: aparece como botão "Falar com a loja" no cardápio e no pedido.
export default function Contato({
  lojaId,
  telefone,
  onSalvo,
}: {
  lojaId: string;
  telefone: string | null;
  onSalvo: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [fone, setFone] = useState(telefone ?? "");
  const [msg, setMsg] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const digitos = fone.replace(/\D/g, "");
    // aceita DDD + número (10 ou 11 dígitos) ou com 55 na frente; vazio = remover
    if (digitos && !/^(55)?\d{10,11}$/.test(digitos)) {
      setMsg("Digite o DDD e o número. Exemplo: (88) 99999-9999");
      return;
    }
    const { error } = await supabase
      .from("lojas")
      .update({ telefone: digitos || null })
      .eq("id", lojaId);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(digitos ? "Salvo ✓" : "WhatsApp removido ✓");
    onSalvo();
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">WhatsApp da loja</h2>
      <p className="text-sm text-gray-600">
        Aparece para os clientes como botão &quot;Falar com a loja&quot; no
        cardápio e na página do pedido. É também o número que recebe os
        comprovantes do Pix. Deixe vazio para não mostrar.
      </p>
      <input
        value={fone}
        onChange={(e) => setFone(e.target.value)}
        placeholder="(88) 99999-9999"
        inputMode="tel"
        className={campo}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Salvar
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </form>
  );
}

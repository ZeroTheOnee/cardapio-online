"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border p-3";

export default function FormEsqueci({
  linkInvalido,
}: {
  linkInvalido: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [erro, setErro] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setDetalhe("");
    setCarregando(true);

    const email = String(new FormData(e.currentTarget).get("email")).trim();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setCarregando(false);

    if (error) {
      setErro(
        error.message.toLowerCase().includes("rate limit")
          ? "Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo."
          : "Não foi possível enviar o e-mail agora. Tente de novo em instantes."
      );
      setDetalhe(error.message);
      return;
    }
    setEnviado(true);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Esqueci minha senha</h1>

      {linkInvalido && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Este link expirou ou já foi usado. Peça um novo abaixo.
        </p>
      )}

      {enviado ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="rounded-lg bg-green-50 p-3 text-green-800">
            Se este e-mail estiver cadastrado, enviamos um link para criar uma
            nova senha. Confira também a caixa de spam.
          </p>
          <a href="/entrar" className="inline-block underline">
            Voltar para entrar
          </a>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-6 space-y-3">
          <p className="text-sm text-gray-600">
            Digite o e-mail da sua conta e enviaremos um link para você criar
            uma nova senha.
          </p>
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            required
            className={campo}
          />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {detalhe && <p className="text-xs text-gray-400">({detalhe})</p>}
          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
          >
            {carregando ? "Enviando..." : "Enviar link"}
          </button>
          <a href="/entrar" className="inline-block text-sm underline">
            Voltar para entrar
          </a>
        </form>
      )}
    </main>
  );
}
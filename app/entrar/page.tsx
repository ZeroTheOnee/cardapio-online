"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border p-3";

export default function Entrar() {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const senha = String(f.get("senha"));

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErro("E-mail ou senha incorretos.");
        setCarregando(false);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      });
      if (error || !data.user) {
        setErro(error?.message ?? "Não foi possível criar a conta.");
        setCarregando(false);
        return;
      }
      if (!data.session) {
        setErro("Conta criada. Confirme seu e-mail para poder entrar.");
        setCarregando(false);
        return;
      }

      const { error: erroCliente } = await supabase.from("clientes").insert({
        id: data.user.id,
        nome: String(f.get("nome")),
        telefone: String(f.get("telefone")),
      });
      if (erroCliente) {
        setErro("Erro ao salvar seus dados: " + erroCliente.message);
        setCarregando(false);
        return;
      }

      const { error: erroEndereco } = await supabase.from("enderecos").insert({
        cliente_id: data.user.id,
        rua: String(f.get("rua")),
        numero: String(f.get("numero")),
        bairro: String(f.get("bairro")),
        cidade: String(f.get("cidade")),
        complemento: String(f.get("complemento")) || null,
        referencia: String(f.get("referencia")) || null,
      });
      if (erroEndereco) {
        setErro("Erro ao salvar o endereço: " + erroEndereco.message);
        setCarregando(false);
        return;
      }
    }

    const loja = new URLSearchParams(window.location.search).get("loja");
    router.push(loja ? `/${loja}` : "/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">
        {modo === "entrar" ? "Entrar" : "Criar conta"}
      </h1>

      <form onSubmit={enviar} className="mt-6 space-y-3">
        {modo === "cadastrar" && (
          <>
            <input name="nome" placeholder="Seu nome" required className={campo} />
            <input name="telefone" placeholder="Telefone (WhatsApp)" required className={campo} />
          </>
        )}

        <input name="email" type="email" placeholder="E-mail" required className={campo} />
        <input
          name="senha"
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          minLength={6}
          required
          className={campo}
        />

        {modo === "cadastrar" && (
          <>
            <p className="pt-2 font-semibold">Endereço de entrega</p>
            <input name="rua" placeholder="Rua" required className={campo} />
            <input name="numero" placeholder="Número" required className={campo} />
            <input name="bairro" placeholder="Bairro" required className={campo} />
            <input name="cidade" placeholder="Cidade" required className={campo} />
            <input name="complemento" placeholder="Complemento (opcional)" className={campo} />
            <input name="referencia" placeholder="Ponto de referência (opcional)" className={campo} />
          </>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
        >
          {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
        
      {modo === "entrar" && (
        <a href="/esqueci-senha" className="mt-4 block text-sm underline">
          Esqueci minha senha
        </a>
      )}
      </form>

      <button
        onClick={() => {
          setModo(modo === "entrar" ? "cadastrar" : "entrar");
          setErro("");
        }}
        className="mt-4 text-sm underline"
      >
        {modo === "entrar"
          ? "Não tem conta? Criar conta"
          : "Já tem conta? Entrar"}
      </button>
    </main>
  );
}
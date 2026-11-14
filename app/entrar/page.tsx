"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border p-3";

export default function Entrar() {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  // vindo do link de confirmação do e-mail (aberto em outro navegador/aparelho)
  useEffect(() => {
    const t = setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("confirmado") === "1") {
        setAviso("E-mail confirmado! Entre com seu e-mail e senha.");
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setAviso("");
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
      // Nome, telefone e endereço vão junto no cadastro; quem grava nas tabelas
      // clientes/enderecos é um gatilho no banco (funciona com e sem confirmação de e-mail).
      const lojaSlug = new URLSearchParams(window.location.search).get("loja");
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/cadastro${
            lojaSlug ? "?loja=" + encodeURIComponent(lojaSlug) : ""
          }`,
          data: {
            nome: String(f.get("nome")),
            telefone: String(f.get("telefone")),
            rua: String(f.get("rua")),
            numero: String(f.get("numero")),
            bairro: String(f.get("bairro")),
            cidade: String(f.get("cidade")),
            complemento: String(f.get("complemento") ?? ""),
            referencia: String(f.get("referencia") ?? ""),
          },
        },
      });
      if (error || !data.user) {
        setErro(error?.message ?? "Não foi possível criar a conta.");
        setCarregando(false);
        return;
      }
      if (!data.session) {
        setAviso(
          "Conta criada! Enviamos um e-mail de confirmação. Abra o link e depois volte para entrar."
        );
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
        {aviso && (
          <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">
            {aviso}
          </p>
        )}

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
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Loja = {
  id: string;
  cor_principal: string;
  descricao: string | null;
  instagram: string | null;
  endereco_texto: string | null;
};

const campo = "w-full rounded-lg border p-2";

const CORES: [string, string][] = [
  ["Vermelho", "#b91c1c"],
  ["Laranja", "#c2410c"],
  ["Amarelo", "#a16207"],
  ["Verde", "#15803d"],
  ["Azul", "#1d4ed8"],
  ["Roxo", "#7e22ce"],
  ["Rosa", "#be185d"],
  ["Preto", "#111827"],
];

export default function Aparencia({ loja }: { loja: Loja }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [cor, setCor] = useState(loja.cor_principal);
  const [descricao, setDescricao] = useState(loja.descricao ?? "");
  const [instagram, setInstagram] = useState(loja.instagram ?? "");
  const [endereco, setEndereco] = useState(loja.endereco_texto ?? "");
  const [msg, setMsg] = useState("");

  async function salvar() {
    if (!/^#[0-9a-fA-F]{6}$/.test(cor)) {
      setMsg("Cor inválida. Escolha uma das cores ou use o seletor.");
      return;
    }

    // aceita "@loja", "loja" ou o link do perfil
    const insta = instagram
      .trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/[/?].*$/, "");
    if (insta && !/^[A-Za-z0-9._]{1,30}$/.test(insta)) {
      setMsg("Instagram inválido. Use só o nome do perfil (ex.: minhaloja).");
      return;
    }

    const { error } = await supabase
      .from("lojas")
      .update({
        cor_principal: cor,
        descricao: descricao.trim() || null,
        instagram: insta || null,
        endereco_texto: endereco.trim() || null,
      })
      .eq("id", loja.id);

    if (error) {
      setMsg(error.message);
      return;
    }
    setInstagram(insta);
    setMsg("Salvo ✓ — abra o cardápio para ver o resultado.");
    router.refresh();
  }

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Aparência do cardápio</h2>

      <div>
        <p className="text-sm font-medium">Cor principal</p>
        <p className="text-xs text-gray-500">
          Aparece nos botões, na capa e nos destaques. Prefira cores um pouco
          escuras, que combinam melhor com o fundo branco.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CORES.map(([nome, hex]) => (
            <button
              key={hex}
              type="button"
              onClick={() => setCor(hex)}
              title={nome}
              style={{ backgroundColor: hex }}
              className={`h-9 w-9 rounded-full border-2 ${
                cor.toLowerCase() === hex ? "border-black" : "border-white"
              } shadow`}
            />
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(cor) ? cor : "#111827"}
              onChange={(e) => setCor(e.target.value)}
              className="h-9 w-12 cursor-pointer"
            />
            Outra cor
          </label>
        </div>
        <div
          style={{ backgroundColor: cor }}
          className="mt-3 rounded-lg px-4 py-2 text-center text-sm text-white"
        >
          Prévia da cor
        </div>
      </div>

      <label className="block text-sm">
        Texto de boas-vindas
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Ex.: Os melhores lanches da cidade, feitos na hora!"
          className={campo}
        />
      </label>

      <label className="block text-sm">
        Instagram
        <input
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@minhaloja"
          className={campo}
        />
      </label>

      <label className="block text-sm">
        Endereço da loja
        <input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Rua, número - bairro, cidade"
          className={campo}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Salvar
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
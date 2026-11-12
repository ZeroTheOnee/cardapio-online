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
  logo_url: string | null;
  capa_url: string | null;
};

const campo = "w-full rounded-lg border p-2";
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

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

function reduzirImagem(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const url = URL.createObjectURL(file);
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, 1200 / imagem.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
      const contexto = canvas.getContext("2d");
      if (!contexto) {
        reject(new Error("Não foi possível processar esta imagem."));
        return;
      }
      contexto.fillStyle = "#ffffff";
contexto.fillRect(0, 0, canvas.width, canvas.height);
contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Não foi possível converter a imagem para JPEG.")),
        "image/jpeg",
        0.82
      );
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir esta imagem."));
    };
    imagem.src = url;
  });
}

export default function Aparencia({ loja }: { loja: Loja }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [cor, setCor] = useState(loja.cor_principal);
  const [descricao, setDescricao] = useState(loja.descricao ?? "");
  const [instagram, setInstagram] = useState(loja.instagram ?? "");
  const [endereco, setEndereco] = useState(loja.endereco_texto ?? "");
  const [logoUrl, setLogoUrl] = useState(loja.logo_url);
  const [capaUrl, setCapaUrl] = useState(loja.capa_url);
  const [msg, setMsg] = useState("");
  const [imagemOcupada, setImagemOcupada] = useState<"logo" | "capa" | null>(null);

  async function enviarImagem(tipo: "logo" | "capa", file?: File) {
    if (!file) return;
    if (!TIPOS_ACEITOS.includes(file.type)) {
      setMsg("Escolha uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setMsg("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setImagemOcupada(tipo);
    setMsg("Preparando imagem...");
    let caminhoNovo: string | null = null;
    try {
      const jpeg = await reduzirImagem(file);
      caminhoNovo = `${loja.id}/${tipo}-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("lojas")
        .upload(caminhoNovo, jpeg, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("lojas").getPublicUrl(caminhoNovo);
      const campoUrl = tipo === "logo" ? "logo_url" : "capa_url";
      const urlAntiga = tipo === "logo" ? logoUrl : capaUrl;
      const { error: salvarErro } = await supabase
        .from("lojas")
        .update({ [campoUrl]: data.publicUrl })
        .eq("id", loja.id);
      if (salvarErro) throw salvarErro;

      if (tipo === "logo") setLogoUrl(data.publicUrl);
      else setCapaUrl(data.publicUrl);
      caminhoNovo = null;

      const caminhoAntigo = extrairCaminho(urlAntiga, loja.id);
      if (caminhoAntigo) {
        const { error } = await supabase.storage.from("lojas").remove([caminhoAntigo]);
        if (error) setMsg("Imagem atualizada. Não consegui apagar o arquivo antigo: " + error.message);
        else setMsg("Imagem atualizada.");
      } else {
        setMsg("Imagem atualizada.");
      }
      router.refresh();
    } catch (erro) {
      if (caminhoNovo) await supabase.storage.from("lojas").remove([caminhoNovo]);
      setMsg(erro instanceof Error ? erro.message : "Não foi possível enviar a imagem.");
    } finally {
      setImagemOcupada(null);
    }
  }

  function extrairCaminho(url: string | null, lojaId: string) {
    if (!url) return null;
    const marcador = "/storage/v1/object/public/lojas/";
    const indice = url.indexOf(marcador);
    if (indice < 0) return null;
    const caminho = decodeURIComponent(url.slice(indice + marcador.length).split("?")[0]);
    return caminho.startsWith(`${lojaId}/`) ? caminho : null;
  }

  async function apagarImagem(tipo: "logo" | "capa") {
    const url = tipo === "logo" ? logoUrl : capaUrl;
    const caminho = extrairCaminho(url, loja.id);
    if (!url || !caminho) {
      setMsg("Não encontrei o arquivo desta imagem no bucket da loja.");
      return;
    }
    setImagemOcupada(tipo);
    setMsg("Apagando imagem...");
    const campoUrl = tipo === "logo" ? "logo_url" : "capa_url";
    const { error: salvarErro } = await supabase
      .from("lojas")
      .update({ [campoUrl]: null })
      .eq("id", loja.id);
    if (salvarErro) {
      setMsg(salvarErro.message);
      setImagemOcupada(null);
      return;
    }
    const { error } = await supabase.storage.from("lojas").remove([caminho]);
    if (tipo === "logo") setLogoUrl(null);
    else setCapaUrl(null);
    setMsg(error ? `Imagem removida do cardápio, mas o arquivo não foi apagado: ${error.message}` : "Imagem apagada.");
    setImagemOcupada(null);
    router.refresh();
  }

  async function salvar() {
    if (!/^#[0-9a-fA-F]{6}$/.test(cor)) {
      setMsg("Cor inválida. Escolha uma das cores ou use o seletor.");
      return;
    }
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
    setMsg("Salvo. Abra o cardápio para ver o resultado.");
    router.refresh();
  }

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Aparência do cardápio</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoImagem titulo="Logo da loja" url={logoUrl} ocupada={imagemOcupada === "logo"} onEnviar={(f) => enviarImagem("logo", f)} onApagar={() => apagarImagem("logo")} />
        <CampoImagem titulo="Capa do cardápio" url={capaUrl} ocupada={imagemOcupada === "capa"} onEnviar={(f) => enviarImagem("capa", f)} onApagar={() => apagarImagem("capa")} />
      </div>
      <p className="text-xs text-gray-500">JPG, PNG ou WebP, até 5 MB. A imagem será convertida para JPEG e ajustada para no máximo 1200 px de largura.</p>

      <div>
        <p className="text-sm font-medium">Cor principal</p>
        <p className="text-xs text-gray-500">Aparece nos botões, na capa e nos destaques. Prefira cores um pouco escuras, que combinam melhor com o fundo branco.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CORES.map(([nome, hex]) => (
            <button key={hex} type="button" onClick={() => setCor(hex)} title={nome} style={{ backgroundColor: hex }} className={`h-9 w-9 rounded-full border-2 ${cor.toLowerCase() === hex ? "border-black" : "border-white"} shadow`} />
          ))}
          <label className="flex items-center gap-2 text-sm"><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(cor) ? cor : "#111827"} onChange={(e) => setCor(e.target.value)} className="h-9 w-12 cursor-pointer" />Outra cor</label>
        </div>
        <div style={{ backgroundColor: cor }} className="mt-3 rounded-lg px-4 py-2 text-center text-sm text-white">Prévia da cor</div>
      </div>

      <label className="block text-sm">Texto de boas-vindas<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} rows={3} placeholder="Ex.: Os melhores lanches da cidade, feitos na hora!" className={campo} /></label>
      <label className="block text-sm">Instagram<input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@minhaloja" className={campo} /></label>
      <label className="block text-sm">Endereço da loja<input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número - bairro, cidade" className={campo} /></label>
      <div className="flex items-center gap-3"><button onClick={salvar} className="rounded-lg bg-black px-4 py-2 text-white">Salvar</button>{msg && <span role="status" className="text-sm text-gray-600">{msg}</span>}</div>
    </div>
  );
}

function CampoImagem({ titulo, url, ocupada, onEnviar, onApagar }: { titulo: string; url: string | null; ocupada: boolean; onEnviar: (file?: File) => void; onApagar: () => void }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <h3 className="font-medium">{titulo}</h3>
      {url ? <img src={url} alt={titulo} className="h-36 w-full rounded object-cover" /> : <div className="flex h-36 items-center justify-center rounded bg-gray-100 text-sm text-gray-500">Nenhuma imagem</div>}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm">{ocupada ? "Aguarde..." : url ? "Trocar imagem" : "Enviar imagem"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupada} className="sr-only" onChange={(e) => { onEnviar(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
        {url && <button type="button" disabled={ocupada} onClick={onApagar} className="rounded-lg border border-red-600 px-3 py-2 text-sm text-red-700">Apagar</button>}
      </div>
    </div>
  );
}

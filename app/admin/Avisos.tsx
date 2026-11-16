"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function paraUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function Avisos({ lojaId }: { lojaId: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Receba o aviso de pedido novo no celular ou no computador mesmo com o
        navegador fechado.
      </p>
      <Push lojaId={lojaId} />
      <Teste />
    </div>
  );
}

function Push({ lojaId }: { lojaId: string }) {
  const [supabase] = useState(() => createClient());
  const [suporte, setSuporte] = useState<boolean | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSuporte(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setAtivo(!!sub))
      .catch(() => {});
    // registra cedo para o "ready" funcionar nas próximas visitas
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  async function ativar() {
    setMsg("");
    if (!VAPID) {
      setMsg("Avisos push ainda não configurados no servidor.");
      return;
    }
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setMsg(
          "A permissão de notificação foi negada. Libere nas configurações do navegador e tente de novo."
        );
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: paraUint8(VAPID),
        });
      }
      const j = sub.toJSON();
      const { error } = await supabase.from("push_inscricoes").upsert(
        {
          loja_id: lojaId,
          endpoint: sub.endpoint,
          p256dh: j.keys?.p256dh ?? "",
          auth: j.keys?.auth ?? "",
        },
        { onConflict: "endpoint" }
      );
      if (error) {
        setMsg(error.message);
        return;
      }
      setAtivo(true);
      setMsg("Ativado neste aparelho ✓");
    } catch (e) {
      setMsg("Não foi possível ativar: " + (e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_inscricoes").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setAtivo(false);
      setMsg("");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Notificação neste aparelho</h2>
      <p className="text-sm text-gray-600">
        O aviso aparece na tela do celular ou do computador, com o navegador
        fechado. Ative em cada aparelho que for usar.
      </p>
      <p className="text-sm text-gray-600">
        <strong>iPhone:</strong> primeiro instale o PedeEasy: abra esta página
        no Safari, toque em Compartilhar → <em>Adicionar à Tela de Início</em>,
        e abra o ícone novo. Só então ative aqui.
      </p>

      {suporte === false && (
        <p className="text-sm text-red-600">
          Este navegador não suporta notificações. No iPhone, abra pelo ícone
          instalado na tela inicial.
        </p>
      )}

      {suporte && !ativo && (
        <button
          onClick={ativar}
          disabled={ocupado}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {ocupado ? "Ativando..." : "Ativar avisos neste aparelho"}
        </button>
      )}

      {suporte && ativo && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">
            Ativo neste aparelho ✓
          </span>
          <button
            onClick={desativar}
            disabled={ocupado}
            className="rounded-lg border border-red-600 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
          >
            Desativar
          </button>
        </div>
      )}

      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}

function Teste() {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  async function testar() {
    setEnviando(true);
    setMsg("");
    try {
      const r = await fetch("/api/avisos/teste", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.erro ?? "Erro ao enviar o teste.");
      } else if (j.push === 0) {
        setMsg("Nada foi enviado: ative os avisos neste aparelho primeiro.");
      } else {
        setMsg(`Teste enviado para ${j.push} aparelho(s) ✓`);
      }
    } catch {
      setMsg("Erro de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Testar</h2>
      <p className="text-sm text-gray-600">
        Envia um aviso falso agora. Feche o navegador (ou bloqueie a tela) logo
        depois de tocar para ver se chega.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={testar}
          disabled={enviando}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar aviso de teste"}
        </button>
        {msg && <span className="text-sm text-gray-700">{msg}</span>}
      </div>
    </div>
  );
}

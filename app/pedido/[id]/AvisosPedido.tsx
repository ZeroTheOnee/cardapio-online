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

// Botão "Avisar quando o pedido mudar": notificação no celular a cada mudança de status.
export default function AvisosPedido({ pedidoId }: { pedidoId: string }) {
  const [supabase] = useState(() => createClient());
  const [suporte, setSuporte] = useState<boolean | null>(null);
  const [iphone, setIphone] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const ok =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      setSuporte(ok);
      setIphone(/iPhone|iPad|iPod/i.test(navigator.userAgent));
      if (!ok) return;
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then(async (sub) => {
          if (!sub) return;
          const { data } = await supabase
            .from("push_pedidos")
            .select("id")
            .eq("pedido_id", pedidoId)
            .eq("endpoint", sub.endpoint)
            .maybeSingle();
          setAtivo(!!data);
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, [supabase, pedidoId]);

  async function ativar() {
    setMsg("");
    if (!VAPID) {
      setMsg("Avisos ainda não configurados no servidor.");
      return;
    }
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setMsg("Você não permitiu notificações. Libere nas configurações do navegador.");
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
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setMsg("Entre na sua conta para receber os avisos.");
        return;
      }
      const j = sub.toJSON();
      const { error } = await supabase.from("push_pedidos").upsert(
        {
          pedido_id: pedidoId,
          cliente_id: u.user.id,
          endpoint: sub.endpoint,
          p256dh: j.keys?.p256dh ?? "",
          auth: j.keys?.auth ?? "",
        },
        { onConflict: "pedido_id,endpoint" }
      );
      if (error) {
        setMsg(error.message);
        return;
      }
      setAtivo(true);
      setMsg("");
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
        await supabase
          .from("push_pedidos")
          .delete()
          .eq("pedido_id", pedidoId)
          .eq("endpoint", sub.endpoint);
      }
      setAtivo(false);
    } finally {
      setOcupado(false);
    }
  }

  if (suporte === null) return null;

  if (!suporte) {
    // iPhone no Safari comum não recebe push: só com o app instalado na tela inicial
    return iphone ? (
      <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
        Para receber avisos no iPhone, instale o app: toque em Compartilhar →{" "}
        <em>Adicionar à Tela de Início</em> e abra o pedido por lá.
      </p>
    ) : null;
  }

  return (
    <div className="mt-3 rounded-lg border p-3">
      {ativo ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-green-700">🔔 Você será avisado a cada mudança do pedido</span>
          <button
            onClick={desativar}
            disabled={ocupado}
            className="text-xs text-gray-500 underline disabled:opacity-50"
          >
            Desativar
          </button>
        </div>
      ) : (
        <button
          onClick={ativar}
          disabled={ocupado}
          className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {ocupado ? "Ativando..." : "🔔 Avisar quando o pedido mudar"}
        </button>
      )}
      {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
    </div>
  );
}

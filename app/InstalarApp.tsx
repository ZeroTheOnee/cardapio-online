"use client";

import { useEffect, useState } from "react";

// Evento do Chrome/Edge/Android que permite abrir o pedido de instalação
type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Botão "Instalar app": no Android abre o pedido de instalação; no iPhone
// mostra o passo a passo (o iOS não permite instalar por botão).
export default function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [instalado, setInstalado] = useState(true); // escondido até saber
  const [ajuda, setAjuda] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );

    function antes(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    }
    function depois() {
      setInstalado(true);
      setEvento(null);
    }
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", depois);
    return () => {
      window.removeEventListener("beforeinstallprompt", antes);
      window.removeEventListener("appinstalled", depois);
    };
  }, []);

  if (instalado || (!evento && !ios)) return null;

  async function aoClicar() {
    if (evento) {
      await evento.prompt();
      const r = await evento.userChoice;
      if (r.outcome === "accepted") setInstalado(true);
      setEvento(null);
    } else {
      setAjuda((v) => !v);
    }
  }

  return (
    <>
      <button
        onClick={aoClicar}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900"
      >
        📲 Instalar app
      </button>
      {ajuda && (
        <p className="basis-full rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
          No iPhone: toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima) e depois
          em <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
    </>
  );
}

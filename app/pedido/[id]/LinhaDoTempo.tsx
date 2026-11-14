// Linha do tempo do pedido (só exibe; quem muda o status é o dono da loja).

const PASSOS_ENTREGA = [
  { status: "recebido", texto: "Pedido recebido" },
  { status: "preparando", texto: "Em preparo" },
  { status: "saiu_entrega", texto: "Saiu para entrega" },
  { status: "entregue", texto: "Entregue" },
];

const PASSOS_RETIRADA = [
  { status: "recebido", texto: "Pedido recebido" },
  { status: "preparando", texto: "Em preparo" },
  { status: "saiu_entrega", texto: "Pronto para retirada" },
  { status: "entregue", texto: "Retirado" },
];

export default function LinhaDoTempo({
  status,
  tipo,
}: {
  status: string;
  tipo: string;
}) {
  if (status === "cancelado") {
    return (
      <p className="mt-4 rounded-lg bg-red-100 p-3 font-medium text-red-800">
        Pedido cancelado
      </p>
    );
  }

  const passos = tipo === "entrega" ? PASSOS_ENTREGA : PASSOS_RETIRADA;
  const atual = Math.max(
    0,
    passos.findIndex((p) => p.status === status)
  );

  return (
    <ol className="mt-4 space-y-3">
      {passos.map((p, i) => {
        const feito = i < atual || status === "entregue";
        const agora = i === atual && status !== "entregue";
        return (
          <li key={p.status} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                feito
                  ? "bg-green-600 text-white"
                  : agora
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {feito ? "✓" : i + 1}
            </span>
            <span
              className={
                agora
                  ? "font-semibold"
                  : feito
                  ? "text-gray-700"
                  : "text-gray-400"
              }
            >
              {p.texto}
              {agora && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  agora
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import Link from "next/link";
import { PLATAFORMA as P } from "@/lib/legal";

export const metadata = {
  title: `${P.nome} — cardápio online e pedidos para o seu negócio`,
  description:
    "Cardápio digital com pedidos pelo celular para restaurantes, lanchonetes e food trucks. Controle de estoque, preços e entrega em um só lugar.",
};

const CONTATO = P.whatsapp
  ? `https://wa.me/${P.whatsapp}?text=${encodeURIComponent(
      `Olá! Quero saber mais sobre o ${P.nome} para o meu negócio.`
    )}`
  : `mailto:${P.email}?subject=${encodeURIComponent(
      `Quero saber mais sobre o ${P.nome}`
    )}`;

const RECURSOS = [
  {
    titulo: "Cardápio com a cara da sua loja",
    texto:
      "Logo, capa, cores e fotos dos produtos. Seu cliente abre um link e vê o seu negócio, não um site genérico.",
  },
  {
    titulo: "Pedidos direto no seu painel",
    texto:
      "Cada pedido chega na hora, com aviso sonoro. Você avança o status com um toque: em preparo, saiu para entrega, entregue.",
  },
  {
    titulo: "Estoque e preços na sua mão",
    texto:
      "Mudou o preço ou acabou o produto? Atualize em segundos e o cardápio já reflete. Produto esgotado não é vendido.",
  },
  {
    titulo: "Pix e pagamento na entrega",
    texto:
      "Receba por Pix direto na sua chave, ou em dinheiro e cartão na entrega ou retirada.",
  },
  {
    titulo: "Entrega com taxa por bairro",
    texto:
      "Cadastre as localidades que você atende, cada uma com a sua taxa. O cliente escolhe e o total já aparece certo.",
  },
  {
    titulo: "Seu cliente acompanha o pedido",
    texto:
      "Ele vê em que etapa está e consegue rever os pedidos anteriores. Menos mensagem perguntando \"já saiu?\".",
  },
];

const PASSOS = [
  { n: "1", titulo: "Montamos a sua loja", texto: "Você nos passa logo, fotos e produtos, e deixamos o cardápio no ar." },
  { n: "2", titulo: "Você divulga o link", texto: "Coloque no Instagram, no WhatsApp e no cardápio impresso." },
  { n: "3", titulo: "Os pedidos chegam", texto: "Seus clientes pedem pelo celular e você acompanha tudo no painel." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fffdfa] text-gray-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-xl font-extrabold tracking-tight">
          Pede<span className="text-orange-600">Easy</span>
        </span>
        <Link
          href="/entrar?loja=admin"
          className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:border-orange-200 hover:bg-orange-50"
        >
          Entrar no painel
        </Link>
      </header>

      <main>
        {/* Apresentação */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-50 via-white to-amber-100 px-6 py-12 ring-1 ring-orange-100 sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
            <p className="relative mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-orange-800 shadow-sm ring-1 ring-orange-100">
              Para restaurantes, lanchonetes e food trucks
            </p>
            <h1 className="relative max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Seu cardápio online, com pedidos pelo celular.
            </h1>
            <p className="relative mt-5 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
              Seus clientes pedem por um link, você recebe tudo num painel simples
              e controla estoque, preços e entrega. Sem planilha e sem anotar
              pedido de cabeça.
            </p>
            <div className="relative mt-8 flex flex-wrap gap-3">
              <a
                href={CONTATO}
                target={P.whatsapp ? "_blank" : undefined}
                rel="noreferrer"
                className="rounded-xl bg-orange-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:-translate-y-0.5 hover:bg-orange-700"
              >
                Quero para o meu negócio
              </a>
              <Link
                href="/lanchonete-exemplo"
                className="rounded-xl border border-gray-200 bg-white/80 px-6 py-3.5 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white"
              >
                Ver um cardápio de exemplo
              </Link>
            </div>
          </div>
        </section>

        {/* Recursos */}
        <section className="bg-[#f7f5f0] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Tudo o que você precisa para vender pelo celular
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map((r) => (
                <div
                  key={r.titulo}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-900/[0.025] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <h3 className="font-semibold">{r.titulo}</h3>
                  <p className="mt-2 text-sm text-gray-600">{r.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="text-2xl font-bold sm:text-3xl">Como funciona</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {PASSOS.map((p) => (
              <li key={p.n} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 font-bold text-white shadow-md shadow-orange-600/20">
                  {p.n}
                </span>
                <div>
                  <h3 className="font-semibold">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-gray-600">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Preço */}
        <section className="bg-[#f7f5f0] py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Um preço simples, sem comissão por pedido
            </h2>
            <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-orange-100 bg-white p-8 text-left shadow-xl shadow-orange-900/[0.04]">
              <p className="text-sm font-medium text-orange-700">
                Plano único
              </p>
              <p className="mt-2 text-5xl font-extrabold">
                R$ 49
                <span className="text-lg font-medium text-gray-500"> /mês</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-gray-700">
                <li>✓ Cardápio com a marca da sua loja</li>
                <li>✓ Painel de pedidos, estoque e preços</li>
                <li>✓ Pix e pagamento na entrega</li>
                <li>✓ Taxa de entrega por bairro</li>
                <li>✓ Montagem do seu cardápio por nossa conta</li>
                <li>✓ Suporte por WhatsApp</li>
                <li>✓ Sem comissão por pedido e sem fidelidade</li>
              </ul>
              <a
                href={CONTATO}
                target={P.whatsapp ? "_blank" : undefined}
                rel="noreferrer"
                className="mt-8 block rounded-xl bg-orange-600 px-6 py-3.5 text-center font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
              >
                Quero começar
              </a>
            </div>
          </div>
        </section>

        {/* Chamada final */}
        <section className="bg-gradient-to-br from-orange-600 to-orange-700 py-16 text-white sm:py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Vamos colocar o seu cardápio no ar?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-orange-100">
              Fale com a gente e veja como fica a sua loja.
            </p>
            <a
              href={CONTATO}
              target={P.whatsapp ? "_blank" : undefined}
              rel="noreferrer"
              className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-orange-700 hover:bg-orange-50"
            >
              Falar com a {P.nome}
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-sm text-gray-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} {P.nome} · {P.cidade}
          </span>
          <span className="flex gap-4">
            <Link href="/termos" className="underline">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="underline">
              Política de privacidade
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

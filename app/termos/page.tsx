import Link from "next/link";
import { PLATAFORMA as P } from "@/lib/legal";

export const metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 leading-relaxed text-gray-800">
      <h1 className="text-2xl font-bold">Termos de uso</h1>
      <p className="text-sm text-gray-500">
        Última atualização: {P.atualizadoEm}
      </p>

      <h2 className="pt-2 text-lg font-semibold">1. Quem somos</h2>
      <p>
        A {P.nome} é uma plataforma de cardápio digital e pedidos online
        mantida por {P.responsavel}
        {P.documento ? ` (${P.documento})` : ""}, de {P.cidade}. Ela permite que restaurantes, lanchonetes e food trucks
        (&ldquo;lojas&rdquo;) apresentem seus produtos e recebam pedidos de
        clientes.
      </p>

      <h2 className="pt-2 text-lg font-semibold">2. Qual é o nosso papel</h2>
      <p>
        A plataforma é apenas a ferramenta que conecta você à loja. Quem
        prepara, vende e entrega os produtos é a <strong>loja</strong>. A
        loja é responsável pelo cardápio, pelos preços, pelo estoque, pela
        qualidade e pela entrega dos produtos, pelo prazo e pelo atendimento.
        Dúvidas ou reclamações sobre um pedido devem ser feitas diretamente à
        loja.
      </p>

      <h2 className="pt-2 text-lg font-semibold">3. Cadastro</h2>
      <p>
        Para fazer pedidos você cria uma conta com nome, telefone, e-mail,
        senha e endereço de entrega. Você se compromete a informar dados
        verdadeiros e a manter sua senha em segurança. Tudo o que for feito
        com a sua conta é de sua responsabilidade. Avise-nos se suspeitar de
        uso indevido.
      </p>

      <h2 className="pt-2 text-lg font-semibold">4. Pedidos e preços</h2>
      <p>
        Ao confirmar um pedido você está solicitando a compra à loja. Preço,
        taxa de entrega e total são calculados pelo sistema no momento do
        pedido e mostrados antes da confirmação. A loja pode cancelar um
        pedido, por exemplo por falta de produto, falta de entregador ou
        impossibilidade de entregar no endereço informado, e você será
        avisado pelo acompanhamento do pedido.
      </p>

      <h2 className="pt-2 text-lg font-semibold">5. Pagamento</h2>
      <p>
        A plataforma <strong>não processa pagamentos</strong>. O pagamento é
        feito diretamente à loja: em dinheiro ou cartão na entrega ou
        retirada, ou por Pix para a chave informada pela loja. No Pix, o
        pedido só é tratado como pago quando a própria loja confirmar o
        recebimento. Guarde o comprovante. Questões sobre valores pagos,
        troco ou reembolso são resolvidas com a loja.
      </p>

      <h2 className="pt-2 text-lg font-semibold">6. Uso adequado</h2>
      <p>
        Você não deve usar a plataforma para fraudar pedidos, enviar dados
        falsos, tentar acessar áreas ou contas que não são suas, interferir
        no funcionamento do sistema ou praticar qualquer ato ilegal. Podemos
        suspender ou encerrar contas que descumpram estes termos.
      </p>

      <h2 className="pt-2 text-lg font-semibold">7. Disponibilidade</h2>
      <p>
        Trabalhamos para manter a plataforma no ar, mas ela pode ficar
        indisponível por manutenção, falhas de internet ou de serviços de
        terceiros. Não garantimos funcionamento ininterrupto, e a
        responsabilidade da plataforma se limita ao que a lei determina.
      </p>

      <h2 className="pt-2 text-lg font-semibold">8. Dados pessoais</h2>
      <p>
        O tratamento dos seus dados está descrito na{" "}
        <Link href="/privacidade" className="underline">
          Política de privacidade
        </Link>
        .
      </p>

      <h2 className="pt-2 text-lg font-semibold">9. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos. A data da última atualização fica no
        topo desta página. Mudanças relevantes serão informadas no site.
      </p>

      <h2 className="pt-2 text-lg font-semibold">10. Contato e foro</h2>
      <p>
        Fale conosco pelo e-mail {P.email}. Estes termos seguem a lei
        brasileira, e fica eleito o foro do domicílio do consumidor para
        resolver eventuais conflitos.
      </p>

      <p className="pt-4 text-sm">
        <Link href="/" className="underline">
          Voltar
        </Link>
      </p>
    </main>
  );
}

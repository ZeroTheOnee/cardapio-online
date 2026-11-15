import Link from "next/link";
import { PLATAFORMA as P } from "@/lib/legal";

export const metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 leading-relaxed text-gray-800">
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p className="text-sm text-gray-500">
        Última atualização: {P.atualizadoEm}
      </p>

      <p>
        Esta política explica como seus dados pessoais são tratados na{" "}
        {P.nome}, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei
        13.709/2018).
      </p>

      <h2 className="pt-2 text-lg font-semibold">1. Quem cuida dos seus dados</h2>
      <p>
        Quando você faz um pedido, a <strong>loja</strong> escolhida usa os
        seus dados para atender você e decide como eles são usados nesse
        pedido (controladora). A {P.nome}, mantida por {P.responsavel}
        {P.documento ? ` (${P.documento})` : ""}, fornece o sistema e trata os dados em nome da loja
        (operadora). Para a conta de acesso e o funcionamento do sistema, a{" "}
        {P.nome} também responde pelos dados.
      </p>

      <h2 className="pt-2 text-lg font-semibold">2. Quais dados coletamos</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Cadastro:</strong> nome, telefone (WhatsApp), e-mail e senha
          (a senha é guardada de forma protegida, nunca em texto aberto).
        </li>
        <li>
          <strong>Endereço de entrega:</strong> rua, número, bairro, cidade,
          complemento e ponto de referência.
        </li>
        <li>
          <strong>Pedidos:</strong> itens, valores, forma de pagamento, tipo
          (entrega ou retirada), observações e andamento.
        </li>
        <li>
          <strong>Dados no seu aparelho:</strong> o carrinho e a sessão de
          login ficam guardados no seu navegador para o site funcionar. Não
          usamos cookies de publicidade.
        </li>
      </ul>
      <p>
        Não coletamos dados de cartão. O pagamento é feito diretamente à loja.
      </p>

      <h2 className="pt-2 text-lg font-semibold">3. Para que usamos</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Criar e manter a sua conta e permitir o seu login;</li>
        <li>Processar e entregar os seus pedidos;</li>
        <li>Permitir que a loja entre em contato sobre o pedido (inclusive por WhatsApp);</li>
        <li>Mostrar o andamento e o histórico dos seus pedidos;</li>
        <li>Recuperar a sua senha e enviar e-mails do sistema;</li>
        <li>Manter a segurança e prevenir fraudes;</li>
        <li>Cumprir obrigações legais.</li>
      </ul>
      <p>
        As bases legais são a execução do contrato do seu pedido, o legítimo
        interesse na segurança do sistema e o cumprimento de obrigações
        legais.
      </p>

      <h2 className="pt-2 text-lg font-semibold">4. Com quem compartilhamos</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>A loja em que você pediu:</strong> vê seu nome, telefone,
          endereço (nas entregas) e os dados do pedido. Ela não vê dados de
          pedidos feitos em outras lojas.
        </li>
        <li>
          <strong>Provedores de tecnologia:</strong> usamos serviços de
          hospedagem, banco de dados e e-mail para o sistema funcionar. Esses
          serviços podem ter servidores fora do Brasil.
        </li>
        <li>
          <strong>Autoridades:</strong> quando a lei exigir.
        </li>
      </ul>
      <p>Não vendemos seus dados.</p>

      <h2 className="pt-2 text-lg font-semibold">5. Por quanto tempo guardamos</h2>
      <p>
        Guardamos seus dados enquanto a sua conta existir e pelo prazo
        necessário para cumprir obrigações legais e resolver eventuais
        disputas sobre pedidos. Depois disso, eles são apagados ou
        anonimizados.
      </p>

      <h2 className="pt-2 text-lg font-semibold">6. Seus direitos</h2>
      <p>
        Você pode pedir: confirmação de que tratamos seus dados; acesso;
        correção de dados incorretos; anonimização, bloqueio ou eliminação
        de dados desnecessários; portabilidade; informação sobre com quem
        compartilhamos; e a exclusão da sua conta. Envie o pedido para{" "}
        {P.email}. Se achar necessário, você também pode reclamar à
        Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2 className="pt-2 text-lg font-semibold">7. Segurança</h2>
      <p>
        Usamos conexão segura (HTTPS), controle de acesso por conta e
        regras que impedem um cliente de ver os dados de outro. Nenhum
        sistema é 100% seguro, mas trabalhamos para proteger os seus dados e
        avisaremos em caso de incidente relevante, como a lei determina.
      </p>

      <h2 className="pt-2 text-lg font-semibold">8. Crianças e adolescentes</h2>
      <p>
        O serviço é destinado a maiores de 18 anos. Menores de idade devem
        usá-lo com o acompanhamento de um responsável.
      </p>

      <h2 className="pt-2 text-lg font-semibold">9. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política. A data da última atualização fica
        no topo desta página.
      </p>

      <h2 className="pt-2 text-lg font-semibold">10. Contato</h2>
      <p>
        Dúvidas sobre seus dados: {P.email}. Veja também os{" "}
        <Link href="/termos" className="underline">
          Termos de uso
        </Link>
        .
      </p>

      <p className="pt-4 text-sm">
        <Link href="/" className="underline">
          Voltar
        </Link>
      </p>
    </main>
  );
}

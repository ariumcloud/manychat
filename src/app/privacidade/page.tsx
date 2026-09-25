import { CONTACT_WHATSAPP, CONTACT_WHATSAPP_URL, LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Política de Privacidade — Comentou" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        O Comentou (&ldquo;nós&rdquo;) é uma plataforma que automatiza o envio de mensagens diretas no
        Instagram a partir de comentários. Esta política explica quais dados tratamos, para que, e
        como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei
        13.709/2018).
      </p>

      <h2>1. Quem é quem</h2>
      <p>
        <strong>Nossos clientes</strong> são criadores e empresas que conectam o próprio Instagram
        Profissional ao Comentou. <strong>Os contatos</strong> são as pessoas que comentam ou
        conversam com esses perfis. Em relação aos dados do cliente, somos controladores. Em relação
        aos dados dos contatos, atuamos como operadores, seguindo as instruções do cliente que
        configurou a automação.
      </p>

      <h2>2. Dados que tratamos</h2>
      <ul>
        <li>
          <strong>Conta no Comentou:</strong> e-mail, senha (armazenada apenas como hash) e plano
          contratado.
        </li>
        <li>
          <strong>Instagram do cliente</strong> (via login oficial do Instagram): identificador da
          conta, nome de usuário, número de seguidores e o token de acesso autorizado por você.
        </li>
        <li>
          <strong>Contatos e conversas:</strong> identificador do contato no Instagram, nome de
          usuário, comentários que acionam a automação, mensagens enviadas e recebidas na conversa e
          respostas a botões.
        </li>
        <li>
          <strong>Uso e cobrança:</strong> contagem mensal de mensagens enviadas e status da
          assinatura. Os dados do cartão são tratados exclusivamente pela Stripe; nós não os vemos nem
          os armazenamos.
        </li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Executar as automações que o cliente configurou (responder a comentários e enviar DMs).</li>
        <li>Mostrar conversas, contatos e métricas no painel do cliente.</li>
        <li>Cobrar a assinatura, controlar limites de uso e prevenir abuso.</li>
        <li>Manter a segurança, corrigir falhas e cumprir obrigações legais.</li>
      </ul>
      <p>
        <strong>Não vendemos dados</strong> e não os usamos para publicidade. Dados obtidos do
        Instagram são usados apenas para prestar o serviço ao cliente que os autorizou.
      </p>

      <h2>4. Bases legais</h2>
      <p>
        Execução de contrato (prestar o serviço contratado), legítimo interesse (segurança e
        prevenção a fraude), cumprimento de obrigação legal e, quando aplicável, consentimento.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>Apenas com prestadores necessários para operar o serviço:</p>
      <ul>
        <li>Meta / Instagram: para enviar e receber as mensagens e comentários autorizados.</li>
        <li>Supabase: banco de dados.</li>
        <li>Vercel: hospedagem da aplicação.</li>
        <li>Stripe: pagamentos e assinaturas.</li>
      </ul>
      <p>
        Alguns desses prestadores processam dados fora do Brasil, com salvaguardas contratuais
        adequadas.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Ao desconectar o Instagram, o token de
        acesso deixa de ser usado. Ao pedir a exclusão (veja{" "}
        <a href="/exclusao-de-dados">Exclusão de dados</a>), apagamos os dados da conta e das
        conversas em até 30 dias, exceto o que a lei nos obrigue a guardar, como registros fiscais
        de cobrança.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade,
        anonimização, eliminação e informação sobre compartilhamento, além de revogar
        consentimentos. Se você é um contato de um perfil que usa o Comentou, pode pedir também
        diretamente a esse perfil. Para exercer qualquer direito, fale conosco pelo WhatsApp{" "}
        <a href={CONTACT_WHATSAPP_URL}>{CONTACT_WHATSAPP}</a>.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexões criptografadas (HTTPS), senhas armazenadas com hash, acesso restrito ao
        banco de dados e isolamento entre as contas dos clientes. Nenhum sistema é totalmente
        imune, e em caso de incidente relevante comunicaremos os afetados e a ANPD conforme a lei.
      </p>

      <h2>9. Alterações</h2>
      <p>
        Podemos atualizar esta política. Mudanças relevantes serão informadas no painel ou por
        e-mail, e a data no topo desta página sempre indica a versão em vigor.
      </p>

      <h2>10. Contato</h2>
      <p>
        Dúvidas ou pedidos: WhatsApp <a href={CONTACT_WHATSAPP_URL}>{CONTACT_WHATSAPP}</a>.
      </p>
    </LegalPage>
  );
}

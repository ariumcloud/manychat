import { CONTACT_WHATSAPP, CONTACT_WHATSAPP_URL, LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Exclusão de dados — Comentou" };

export default function ExclusaoDeDadosPage() {
  return (
    <LegalPage title="Exclusão de dados">
      <p>
        Você pode pedir a qualquer momento que apaguemos os seus dados do Comentou, ou interromper o
        acesso que o Comentou tem ao seu Instagram. Veja as opções abaixo.
      </p>

      <h2>1. Parar o acesso ao seu Instagram</h2>
      <p>
        No Instagram, vá em <strong>Configurações → Apps e sites</strong> (ou Configurações da conta
        → Permissões do app) e remova o Comentou. O token deixa de valer na hora e nenhuma automação
        funciona mais.
      </p>

      <h2>2. Apagar sua conta e seus dados</h2>
      <p>
        Envie uma mensagem pelo WhatsApp <a href={CONTACT_WHATSAPP_URL}>{CONTACT_WHATSAPP}</a> com o
        assunto <strong>&ldquo;Excluir meus dados&rdquo;</strong>, informando:
      </p>
      <ul>
        <li>o e-mail da sua conta no Comentou, ou</li>
        <li>o @ do Instagram conectado (ou, se você é um contato, o seu @ que conversou com o perfil).</li>
      </ul>
      <p>
        Podemos pedir uma confirmação simples de que você é o titular. Concluímos a exclusão em até{" "}
        <strong>30 dias</strong> e avisamos por lá quando terminar.
      </p>

      <h2>3. O que é apagado</h2>
      <ul>
        <li>a conta, o e-mail e o hash da senha;</li>
        <li>o token de acesso e os dados do perfil do Instagram conectado;</li>
        <li>contatos, conversas, mensagens, comentários, fluxos, links e registros de uso associados.</li>
      </ul>
      <p>
        Podemos manter apenas o que a lei exige, como registros fiscais de cobranças já feitas. Os
        dados de pagamento ficam com a Stripe, sujeitos à política dela.
      </p>

      <h2>4. Se você é contato de um perfil</h2>
      <p>
        Se você só comentou ou conversou com um perfil que usa o Comentou, pode pedir a exclusão do
        seu histórico da mesma forma (item 2), informando o seu @ do Instagram.
      </p>

      <p>
        Mais detalhes sobre como tratamos os dados na{" "}
        <a href="/privacidade">Política de Privacidade</a>. Contato: <a href={CONTACT_WHATSAPP_URL}>{CONTACT_WHATSAPP}</a>.
      </p>
    </LegalPage>
  );
}

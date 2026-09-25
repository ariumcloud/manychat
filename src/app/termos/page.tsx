import { CONTACT_WHATSAPP, CONTACT_WHATSAPP_URL, LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Termos de Uso — Comentou" };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Ao criar uma conta ou usar o Comentou você concorda com estes termos. Se não concordar, não
        use o serviço.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O Comentou é uma plataforma de automação para Instagram: a partir de comentários com
        palavras-chave, envia mensagens diretas configuradas por você e organiza as conversas em um
        painel. O serviço depende das APIs oficiais da Meta e pode ser afetado por mudanças ou
        limites impostos por ela.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>Você deve ser maior de idade e fornecer informações verdadeiras.</li>
        <li>Você é responsável por manter sua senha em sigilo e por tudo o que ocorrer na sua conta.</li>
        <li>
          Para conectar o Instagram, sua conta precisa ser Profissional (Comercial ou Criador de
          Conteúdo) e você precisa ter poder para autorizar o acesso.
        </li>
      </ul>

      <h2>3. Planos, pagamento e cancelamento</h2>
      <ul>
        <li>
          Os planos e seus limites mensais de mensagens estão na página de vendas. A cobrança é
          recorrente, mensal, feita pela Stripe.
        </li>
        <li>
          O plano ilimitado está sujeito a uso justo: podemos limitar ou suspender usos que
          prejudiquem a estabilidade do serviço ou que se pareçam com envio em massa abusivo.
        </li>
        <li>
          Você pode cancelar a qualquer momento pelo painel (portal de assinatura). O acesso
          continua até o fim do período já pago; não há reembolso proporcional, salvo quando a lei
          exigir, inclusive o direito de arrependimento de 7 dias do Código de Defesa do
          Consumidor para contratações a distância.
        </li>
        <li>
          Cupons e promoções têm as condições informadas na hora e valem apenas para o período
          indicado.
        </li>
        <li>Ao atingir o limite mensal do plano, novas automações são pausadas até a renovação ou troca de plano.</li>
      </ul>

      <h2>4. Uso aceitável</h2>
      <p>Você concorda em não usar o Comentou para:</p>
      <ul>
        <li>enviar spam, conteúdo enganoso, fraudulento, ilegal, discriminatório ou que viole direitos de terceiros;</li>
        <li>contatar pessoas que não interagiram com o seu perfil;</li>
        <li>violar os Termos da Plataforma do Instagram/Meta ou as políticas da comunidade do Instagram;</li>
        <li>tentar acessar dados de outras contas, contornar limites ou comprometer a segurança do serviço.</li>
      </ul>
      <p>
        Você é o responsável pelo conteúdo das mensagens que suas automações enviam e por ter base
        legal para se comunicar com seus contatos. Podemos suspender ou encerrar contas que violem
        estes termos.
      </p>

      <h2>5. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento ininterrupto nem
        livre de erros. Interrupções da Meta, da Stripe ou de outros provedores estão fora do nosso
        controle.
      </p>

      <h2>6. Responsabilidade</h2>
      <p>
        Na máxima extensão permitida por lei, não respondemos por lucros cessantes, perda de
        oportunidades, bloqueios ou restrições aplicados pela Meta à sua conta, nem por danos
        indiretos. Nossa responsabilidade total limita-se ao valor pago por você nos últimos 3 meses.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        O software e a marca Comentou são nossos. Seus fluxos, textos e conteúdos continuam sendo
        seus, e você nos autoriza a processá-los apenas para prestar o serviço.
      </p>

      <h2>8. Privacidade</h2>
      <p>
        O tratamento de dados pessoais segue a <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>9. Alterações e lei aplicável</h2>
      <p>
        Podemos atualizar estes termos, avisando por e-mail ou no painel. O uso continuado após a
        mudança significa concordância. Estes termos seguem as leis do Brasil, e fica eleito o foro
        do domicílio do consumidor.
      </p>

      <h2>10. Contato</h2>
      <p>
        Suporte: WhatsApp <a href={CONTACT_WHATSAPP_URL}>{CONTACT_WHATSAPP}</a>.
      </p>
    </LegalPage>
  );
}

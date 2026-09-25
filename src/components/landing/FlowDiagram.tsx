/**
 * Mini diagrama do construtor de fluxos: gatilho → condição → dois caminhos.
 * Desenhado em pé (árvore) para caber legível de 360px até o desktop.
 */
export function FlowDiagram() {
  const ok = "#34d399";
  const no = "#f87171";
  return (
    <svg
      viewBox="0 0 360 286"
      className="mx-auto block h-auto w-full max-w-[440px]"
      role="img"
      aria-label="Diagrama de fluxo: o gatilho “Comentou EU QUERO” leva à condição “Segue você?”. Se sim, entrega o ebook. Se não, pede para seguir com o botão JÁ TE SEGUI."
    >
      <defs>
        <marker id="lp-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#7c5cff" />
        </marker>
        <marker id="lp-arrow-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={ok} />
        </marker>
        <marker id="lp-arrow-no" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={no} />
        </marker>
        <linearGradient id="lp-node" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1d2b" />
          <stop offset="1" stopColor="#12141e" />
        </linearGradient>
      </defs>

      <g fontFamily="inherit" textAnchor="middle">
        {/* Gatilho */}
        <rect x="90" y="6" width="180" height="56" rx="14" fill="url(#lp-node)" stroke="#2c3242" />
        <text x="180" y="28" fontSize="10" fontWeight="600" letterSpacing="1.2" fill="#b9a6ff">GATILHO</text>
        <text x="180" y="48" fontSize="14" fontWeight="600" fill="#eef0f7">Comentou “EU QUERO”</text>

        <path d="M180 62 V98" stroke="#7c5cff" strokeWidth="2" strokeDasharray="5 6" className="lp-dash" markerEnd="url(#lp-arrow-accent)" fill="none" />

        {/* Condição */}
        <rect x="105" y="104" width="150" height="56" rx="14" fill="rgba(124,92,255,0.14)" stroke="#7c5cff" />
        <text x="180" y="126" fontSize="10" fontWeight="600" letterSpacing="1.2" fill="#b9a6ff">CONDIÇÃO</text>
        <text x="180" y="146" fontSize="14" fontWeight="600" fill="#eef0f7">Segue você?</text>

        {/* Sim → entrega */}
        <path d="M105 132 H94 Q84 132 84 142 V212" stroke={ok} strokeWidth="2" strokeDasharray="5 6" className="lp-dash" markerEnd="url(#lp-arrow-ok)" fill="none" />
        <rect x="62" y="166" width="44" height="22" rx="11" fill="#0f2a22" stroke={ok} />
        <text x="84" y="181" fontSize="11" fontWeight="600" fill={ok}>Sim</text>

        <rect x="4" y="218" width="160" height="62" rx="14" fill="url(#lp-node)" stroke="rgba(52,211,153,0.5)" />
        <text x="84" y="241" fontSize="10" fontWeight="600" letterSpacing="1.2" fill={ok}>ENTREGA</text>
        <text x="84" y="263" fontSize="14" fontWeight="600" fill="#eef0f7">Manda o ebook 🎁</text>

        {/* Não → pede para seguir */}
        <path d="M255 132 H266 Q276 132 276 142 V212" stroke={no} strokeWidth="2" strokeDasharray="5 6" className="lp-dash" markerEnd="url(#lp-arrow-no)" fill="none" />
        <rect x="254" y="166" width="44" height="22" rx="11" fill="#2d1418" stroke={no} />
        <text x="276" y="181" fontSize="11" fontWeight="600" fill={no}>Não</text>

        <rect x="196" y="218" width="160" height="62" rx="14" fill="url(#lp-node)" stroke="rgba(248,113,113,0.5)" />
        <text x="276" y="241" fontSize="10" fontWeight="600" letterSpacing="1.2" fill={no}>PEDE PARA SEGUIR</text>
        <text x="276" y="263" fontSize="13" fontWeight="600" fill="#eef0f7">Botão “JÁ TE SEGUI”</text>
      </g>
    </svg>
  );
}

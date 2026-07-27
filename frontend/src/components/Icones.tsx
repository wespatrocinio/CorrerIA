// Conjunto de ícones de linha (mesmo estilo do ícone de casa em BarraTopo) — substitui
// os emojis usados antes para contexto/status do treino.

const propsBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconeRua({ className }: { className?: string }) {
  return (
    <svg {...propsBase} className={className}>
      <path d="M4 20 9 4h6l5 16" />
      <path d="M12 4v16" strokeDasharray="2 3" />
    </svg>
  );
}

export function IconeEsteira({ className }: { className?: string }) {
  return (
    <svg {...propsBase} className={className}>
      <rect x="3" y="8" width="18" height="10" rx="2" />
      <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

export function IconeDescanso({ className }: { className?: string }) {
  return (
    <svg {...propsBase} className={className}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function IconeCheck({ className }: { className?: string }) {
  return (
    <svg {...propsBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5 5-5" />
    </svg>
  );
}

export function IconeInfo({ className }: { className?: string }) {
  return (
    <svg {...propsBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function IconeMais({ className }: { className?: string }) {
  return (
    <svg {...propsBase} className={className}>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function BarraTopo({ mostrarHome = true, menu }: { mostrarHome?: boolean; menu?: ReactNode }) {
  if (!mostrarHome && !menu) return null;
  return (
    <div className="barra-topo">
      <div>
        {mostrarHome && (
          <Link to="/" className="btn-icone-topo" aria-label="Ir para o início">
            <IconeCasa />
          </Link>
        )}
      </div>
      <div>{menu}</div>
    </div>
  );
}

function IconeCasa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

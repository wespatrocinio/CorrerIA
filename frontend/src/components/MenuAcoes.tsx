import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface ItemMenu {
  label: string;
  to?: string;
  onClick?: () => void;
}

export default function MenuAcoes({ itens }: { itens: ItemMenu[] }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  return (
    <div className="menu-acoes" ref={ref}>
      <button
        type="button"
        className="btn-icone-topo"
        onClick={() => setAberto((a) => !a)}
        aria-label="Mais opções"
        aria-expanded={aberto}
      >
        ⋮
      </button>
      {aberto && (
        <div className="menu-acoes-lista">
          {itens.map((item) =>
            item.to ? (
              <Link key={item.label} to={item.to} className="menu-acoes-item" onClick={() => setAberto(false)}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className="menu-acoes-item"
                onClick={() => {
                  setAberto(false);
                  item.onClick?.();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { INFO_TREINOS } from '../content/infoTreinos';

export default function InfoTreino({ tipo }: { tipo: string }) {
  const [aberto, setAberto] = useState(false);
  const info = INFO_TREINOS[tipo];
  if (!info) return null;

  return (
    <div>
      <button type="button" className="btn-info" onClick={() => setAberto((a) => !a)}>
        ℹ️ {aberto ? 'Ocultar info' : `Sobre ${tipo.toLowerCase()}`}
      </button>
      {aberto && (
        <div className="painel-info">
          <p>{info.descricao}</p>
          <h3>Benefícios</h3>
          <ul>
            {info.beneficios.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { listarCiclos } from '../api/ciclos';
import { obterCorredor } from '../api/corredor';

// Decide a tela inicial com base no que já existe: sem corredor -> onboarding,
// sem ciclo -> criar ciclo, senão -> o ciclo mais recente.
export default function Bootstrap() {
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function decidir() {
      try {
        await obterCorredor();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          if (!cancelado) setDestino('/onboarding');
          return;
        }
        throw err;
      }

      const ciclos = await listarCiclos();
      if (ciclos.length === 0) {
        if (!cancelado) setDestino('/objetivo-ciclo');
        return;
      }
      const ultimo = ciclos[ciclos.length - 1];
      if (!cancelado) setDestino(`/ciclo/${ultimo.id}`);
    }

    decidir();
    return () => {
      cancelado = true;
    };
  }, []);

  if (!destino) return <div className="tela-carregando">Carregando...</div>;
  return <Navigate to={destino} replace />;
}

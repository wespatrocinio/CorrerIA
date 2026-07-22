import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import RotaProtegida from './components/RotaProtegida';
import Bootstrap from './pages/Bootstrap';
import EditarCiclo from './pages/EditarCiclo';
import EditarTreino from './pages/EditarTreino';
import Login from './pages/Login';
import ObjetivoCiclo from './pages/ObjetivoCiclo';
import Onboarding from './pages/Onboarding';
import Registro from './pages/Registro';
import VisaoCiclo from './pages/VisaoCiclo';
import VisaoSemana from './pages/VisaoSemana';

const queryClient = new QueryClient();

function protegida(elemento: ReactNode) {
  return <RotaProtegida>{elemento}</RotaProtegida>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/" element={protegida(<Bootstrap />)} />
            <Route path="/onboarding" element={protegida(<Onboarding />)} />
            <Route path="/objetivo-ciclo" element={protegida(<ObjetivoCiclo />)} />
            <Route path="/ciclo/:cicloId" element={protegida(<VisaoCiclo />)} />
            <Route path="/ciclo/:cicloId/editar" element={protegida(<EditarCiclo />)} />
            <Route path="/ciclo/:cicloId/semana/:semanaId" element={protegida(<VisaoSemana />)} />
            <Route path="/ciclo/:cicloId/semana/:semanaId/dia/:diaId" element={protegida(<EditarTreino />)} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

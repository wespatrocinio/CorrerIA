// Bootstrap: decide a tela inicial com base no que já existe no localStorage.
(function iniciar() {
  const estado = carregarEstado();

  if (!estado.corredor) {
    Router.ir('onboarding');
    return;
  }

  const ciclo = estado.ciclos[estado.ciclos.length - 1];
  if (!ciclo) {
    Router.ir('objetivo-ciclo');
    return;
  }

  Router.ir('visao-ciclo', { cicloId: ciclo.id });
})();

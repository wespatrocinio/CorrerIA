// Router simples em memória — sem hash/URL, só troca de container.
const Router = (() => {
  const container = () => document.getElementById('app');
  let atual = null;

  const telas = {
    onboarding: () => ScreenOnboarding,
    'objetivo-ciclo': () => ScreenObjetivoCiclo,
    'visao-ciclo': () => ScreenVisaoCiclo,
    'editar-ciclo': () => ScreenEditarCiclo,
    'visao-semana': () => ScreenVisaoSemana,
    'editar-treino': () => ScreenEditarTreino,
  };

  function ir(nomeTela, params) {
    atual = { nomeTela, params };
    const tela = telas[nomeTela]();
    container().innerHTML = '';
    tela.render(container(), params || {});
  }

  function recarregar() {
    if (atual) ir(atual.nomeTela, atual.params);
  }

  return { ir, recarregar };
})();

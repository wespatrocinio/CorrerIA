// Tela 1 — Onboarding (faixas de ritmo), seção 5 e 6 da spec.
const ScreenOnboarding = (() => {
  const FAIXAS = [
    { nivel: 'aquecimento_desaquecimento', label: 'Aquecimento/Desaquecimento', percepcao: 'Trote bem solto, esforço quase nulo', referencia: '7:30' },
    { nivel: 'leve', label: 'Leve', percepcao: 'Dá pra cantar sem esforço', referencia: '7:00' },
    { nivel: 'moderado', label: 'Moderado', percepcao: 'Consegue conversar em frases completas', referencia: '6:30' },
    { nivel: 'forte', label: 'Forte', percepcao: 'Só consegue frases curtas', referencia: '6:00' },
    { nivel: 'muito_forte', label: 'Muito forte', percepcao: 'Quase não consegue falar', referencia: '5:30' },
  ];

  function render(container) {
    const estado = carregarEstado();
    const valores = FAIXAS.reduce((acc, f) => {
      acc[f.nivel] = (estado.corredor && estado.corredor[`faixa_${f.nivel}`]) || f.referencia;
      return acc;
    }, {});

    container.innerHTML = `
      <div class="tela tela-onboarding">
        <h1>Suas faixas de ritmo</h1>
        <p class="subtitulo">Já preenchemos com valores de referência para iniciante. Pode aceitar como está ou ajustar livremente.</p>
        <div class="lista-faixas">
          ${FAIXAS.map((f) => `
            <div class="linha-faixa">
              <div class="linha-faixa-info">
                <strong>${f.label}</strong>
                <span class="percepcao">${f.percepcao}</span>
              </div>
              <input type="text" class="input-faixa" data-nivel="${f.nivel}" value="${valores[f.nivel]}" inputmode="numeric" />
              <span class="unidade">/km</span>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primario" id="btn-continuar">Continuar</button>
      </div>
    `;

    container.querySelector('#btn-continuar').addEventListener('click', () => {
      const estadoAtual = carregarEstado();
      // Congela com o valor que estava valendo ANTES da edição do perfil (seção 4 da spec).
      if (estadoAtual.corredor) congelarIntensidadesPassadas(estadoAtual);

      const corredor = estadoAtual.corredor || { id: uuid() };
      FAIXAS.forEach((f) => {
        const input = container.querySelector(`.input-faixa[data-nivel="${f.nivel}"]`);
        corredor[`faixa_${f.nivel}`] = input.value.trim();
      });
      estadoAtual.corredor = corredor;
      salvarEstado(estadoAtual);

      if (estadoAtual.ciclos.length > 0) {
        const ciclo = estadoAtual.ciclos[estadoAtual.ciclos.length - 1];
        Router.ir('visao-ciclo', { cicloId: ciclo.id });
      } else {
        Router.ir('objetivo-ciclo');
      }
    });
  }

  return { render };
})();

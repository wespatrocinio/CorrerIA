// Tela 2 — Criar objetivo e ciclo, seção 6 da spec.
const ScreenObjetivoCiclo = (() => {
  const TIPOS_OBJETIVO = ['Prova', 'Completar uma distância', 'Recorde pessoal', 'Queimar calorias', 'Outro'];
  const DURACOES = [8, 12, 16];

  function render(container) {
    let tipoSelecionado = TIPOS_OBJETIVO[0];
    let duracaoSelecionada = DURACOES[0];

    container.innerHTML = `
      <div class="tela tela-objetivo-ciclo">
        <h1>Criar objetivo e ciclo</h1>

        <label class="rotulo-campo">Objetivo</label>
        <div class="chips" id="chips-tipo">
          ${TIPOS_OBJETIVO.map((t, i) => `<button type="button" class="chip ${i === 0 ? 'chip-selecionado' : ''}" data-tipo="${t}">${t}</button>`).join('')}
        </div>

        <label class="rotulo-campo" for="input-meta">Meta</label>
        <input type="text" id="input-meta" placeholder="ex: 10km da cidade, sub 50min" />

        <label class="rotulo-campo" for="input-data-alvo">Data alvo (opcional)</label>
        <input type="date" id="input-data-alvo" />

        <label class="rotulo-campo" for="input-data-inicio">Data de início do ciclo</label>
        <input type="date" id="input-data-inicio" value="${new Date().toISOString().slice(0, 10)}" />

        <label class="rotulo-campo">Duração do ciclo</label>
        <div class="chips" id="chips-duracao">
          ${DURACOES.map((d, i) => `<button type="button" class="chip ${i === 0 ? 'chip-selecionado' : ''}" data-duracao="${d}">${d} semanas</button>`).join('')}
        </div>

        <button class="btn btn-primario" id="btn-criar-ciclo">Criar ciclo</button>
      </div>
    `;

    container.querySelector('#chips-tipo').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      tipoSelecionado = btn.dataset.tipo;
      container.querySelectorAll('#chips-tipo .chip').forEach((c) => c.classList.toggle('chip-selecionado', c === btn));
    });

    container.querySelector('#chips-duracao').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      duracaoSelecionada = parseInt(btn.dataset.duracao, 10);
      container.querySelectorAll('#chips-duracao .chip').forEach((c) => c.classList.toggle('chip-selecionado', c === btn));
    });

    container.querySelector('#btn-criar-ciclo').addEventListener('click', () => {
      const estado = carregarEstado();
      const meta = container.querySelector('#input-meta').value.trim();
      const dataAlvo = container.querySelector('#input-data-alvo').value || null;
      const dataInicio = container.querySelector('#input-data-inicio').value;

      const objetivo = {
        id: uuid(),
        corredor_id: estado.corredor.id,
        tipo: tipoSelecionado,
        meta: meta || null,
        data_alvo: dataAlvo,
      };
      estado.objetivos.push(objetivo);

      const ciclo = {
        id: uuid(),
        objetivo_id: objetivo.id,
        data_inicio: dataInicio,
        duracao_semanas: duracaoSelecionada,
        fase: null,
      };
      estado.ciclos.push(ciclo);
      gerarDiasDoCiclo(estado, ciclo);

      salvarEstado(estado);
      Router.ir('visao-ciclo', { cicloId: ciclo.id });
    });
  }

  return { render };
})();

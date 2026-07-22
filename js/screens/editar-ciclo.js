// Editar objetivo e ciclo — título (tipo/meta), data de início e meta de volume semanal.
// data_inicio é ajustada via mudarDataInicioCiclo (desloca as datas dos dias, preservando
// treinos já planejados). duracao_semanas fica de fora: encurtar o ciclo excluiria semanas
// com treino, o que não foi pedido.
const ScreenEditarCiclo = (() => {
  const TIPOS_OBJETIVO = ['Prova', 'Completar uma distância', 'Recorde pessoal', 'Queimar calorias', 'Outro'];

  function render(container, { cicloId }) {
    const estado = carregarEstado();
    const ciclo = estado.ciclos.find((c) => c.id === cicloId);
    const objetivo = estado.objetivos.find((o) => o.id === ciclo.objetivo_id);
    let tipoSelecionado = objetivo.tipo;

    container.innerHTML = `
      <div class="tela tela-objetivo-ciclo">
        <h1>Editar objetivo e ciclo</h1>

        <label class="rotulo-campo">Objetivo</label>
        <div class="chips" id="chips-tipo">
          ${TIPOS_OBJETIVO.map((t) => `<button type="button" class="chip ${t === tipoSelecionado ? 'chip-selecionado' : ''}" data-tipo="${t}">${t}</button>`).join('')}
        </div>

        <label class="rotulo-campo" for="input-meta">Meta</label>
        <input type="text" id="input-meta" placeholder="ex: 10km da cidade, sub 50min" value="${objetivo.meta || ''}" />

        <label class="rotulo-campo" for="input-data-alvo">Data alvo (opcional)</label>
        <input type="date" id="input-data-alvo" value="${objetivo.data_alvo || ''}" />

        <label class="rotulo-campo" for="input-data-inicio">Data de início do ciclo</label>
        <input type="date" id="input-data-inicio" value="${ciclo.data_inicio}" />
        <p class="aviso-data-inicio">Mudar a data desloca todos os dias do ciclo — treinos já planejados são mantidos.</p>

        <label class="rotulo-campo" for="input-meta-volume">Meta de volume semanal (km)</label>
        <input type="number" min="0" step="0.1" id="input-meta-volume" placeholder="ex: 40" value="${ciclo.meta_volume_semanal_km || ''}" />

        <button class="btn btn-primario" id="btn-salvar-ciclo">Salvar</button>
        <button class="btn btn-secundario" id="btn-cancelar">Cancelar</button>
      </div>
    `;

    container.querySelector('#chips-tipo').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      tipoSelecionado = btn.dataset.tipo;
      container.querySelectorAll('#chips-tipo .chip').forEach((c) => c.classList.toggle('chip-selecionado', c === btn));
    });

    container.querySelector('#btn-cancelar').addEventListener('click', () => {
      Router.ir('visao-ciclo', { cicloId });
    });

    container.querySelector('#btn-salvar-ciclo').addEventListener('click', () => {
      const estadoAtual = carregarEstado();
      const objetivoAtual = estadoAtual.objetivos.find((o) => o.id === objetivo.id);
      const cicloAtual = estadoAtual.ciclos.find((c) => c.id === ciclo.id);

      objetivoAtual.tipo = tipoSelecionado;
      objetivoAtual.meta = container.querySelector('#input-meta').value.trim() || null;
      objetivoAtual.data_alvo = container.querySelector('#input-data-alvo').value || null;

      const novaDataInicio = container.querySelector('#input-data-inicio').value;
      mudarDataInicioCiclo(estadoAtual, cicloAtual, novaDataInicio);

      const metaVolume = parseFloat(container.querySelector('#input-meta-volume').value);
      cicloAtual.meta_volume_semanal_km = isNaN(metaVolume) ? null : metaVolume;

      salvarEstado(estadoAtual);
      Router.ir('visao-ciclo', { cicloId });
    });
  }

  return { render };
})();

// Tela 4 — Visão da semana (dias), seção 6 da spec.
const ScreenVisaoSemana = (() => {
  const DIAS_SEMANA_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function labelDiaSemana(dataISO) {
    const d = new Date(dataISO + 'T00:00:00');
    return DIAS_SEMANA_LABEL[d.getDay()];
  }

  function render(container, { semanaId, cicloId }) {
    const estado = carregarEstado();
    const semana = estado.semanas.find((s) => s.id === semanaId);
    const semanasDoCiclo = estado.semanas
      .filter((s) => s.ciclo_id === cicloId)
      .sort((a, b) => a.numero - b.numero);
    const indice = semanasDoCiclo.findIndex((s) => s.id === semana.id);
    const anterior = semanasDoCiclo[indice - 1];
    const proxima = semanasDoCiclo[indice + 1];

    const dias = diasDaSemana(estado, semana.id);
    const volume = somarVolumeSemana(estado, semana.id);

    container.innerHTML = `
      <div class="tela tela-visao-semana">
        <div class="nav-semana">
          <button class="btn btn-icone" id="btn-semana-anterior" ${anterior ? '' : 'disabled'}>‹</button>
          <div class="resumo-semana">
            <strong>Semana ${semana.numero}</strong>
            <span>${formatarData(dias[0].data)} – ${formatarData(dias[dias.length - 1].data)}</span>
            <span>${volume.km.toFixed(1)} km · ${formatarMin(volume.min)}</span>
          </div>
          <button class="btn btn-icone" id="btn-semana-proxima" ${proxima ? '' : 'disabled'}>›</button>
        </div>

        <div class="lista-dias">
          ${dias.map((dia) => renderLinhaDia(estado, dia)).join('')}
        </div>

        <button class="btn btn-secundario" id="btn-voltar-ciclo">Voltar para o ciclo</button>
      </div>
    `;

    if (anterior) {
      container.querySelector('#btn-semana-anterior').addEventListener('click', () => {
        Router.ir('visao-semana', { semanaId: anterior.id, cicloId });
      });
    }
    if (proxima) {
      container.querySelector('#btn-semana-proxima').addEventListener('click', () => {
        Router.ir('visao-semana', { semanaId: proxima.id, cicloId });
      });
    }
    container.querySelector('#btn-voltar-ciclo').addEventListener('click', () => {
      Router.ir('visao-ciclo', { cicloId });
    });

    container.querySelectorAll('[data-ir-dia]').forEach((el) => {
      el.addEventListener('click', () => {
        Router.ir('editar-treino', { diaId: el.dataset.irDia, semanaId, cicloId });
      });
    });
  }

  function renderLinhaDia(estado, dia) {
    const treino = treinoDoDia(estado, dia.id);
    const label = labelDiaSemana(dia.data);

    if (!treino) {
      return `
        <div class="linha-dia clicavel" data-ir-dia="${dia.id}">
          <div class="linha-dia-topo">
            <div class="linha-dia-data"><strong>${label}</strong><span>${formatarData(dia.data)}</span></div>
            <div class="linha-dia-tipo">Descanso</div>
          </div>
        </div>
      `;
    }

    const total = totalTreino(estado, treino.id);
    const corCategoria = CATEGORIA_COR[treino.template_estrutural];
    const iconeContexto = treino.contexto === 'esteira' ? '🏠' : '🛣️';

    return `
      <div class="linha-dia clicavel" data-ir-dia="${dia.id}">
        <div class="linha-dia-topo">
          <div class="linha-dia-data"><strong>${label}</strong><span>${formatarData(dia.data)}</span></div>
          <div class="linha-dia-tipo ${corCategoria}">${treino.tipo}</div>
          <div class="linha-dia-contexto" title="${treino.contexto}">${iconeContexto}</div>
          <div class="linha-dia-totais">
            <span>${total.km.toFixed(1)} km</span>
            <span>${formatarMin(total.min)}</span>
          </div>
        </div>
        ${renderStatusRealizacao(treino, total)}
      </div>
    `;
  }

  function renderStatusRealizacao(treino, total) {
    if (treino.status !== 'realizado') {
      return '<div class="linha-dia-status status-planejado">Planejado</div>';
    }
    const kmReal = treino.km_realizado != null ? treino.km_realizado : total.km;
    const deltaKm = kmReal - total.km;
    const deltaTexto = Math.abs(deltaKm) < 0.05
      ? 'igual ao planejado'
      : `${deltaKm > 0 ? '+' : ''}${deltaKm.toFixed(1)} km vs. planejado`;
    const categoria = treino.realizacao_categoria ? labelCategoriaRealizacao(treino.realizacao_categoria) : '';

    return `
      <div class="linha-dia-status status-realizado">
        <span>✅ Realizado${categoria ? ' · ' + categoria : ''}</span>
        <span>${kmReal.toFixed(1)} km (${deltaTexto})</span>
      </div>
    `;
  }

  return { render };
})();

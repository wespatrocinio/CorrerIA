// Tela 3 — Visão do ciclo (lista de semanas), seção 6 da spec.
const ScreenVisaoCiclo = (() => {
  function semanaAtualNumero(estado, semanas) {
    const hoje = hojeISO();
    const atual = semanas.find((s) => estadoVisualSemana(estado, s) === 'atual');
    if (atual) return atual.numero;
    const passadas = semanas.filter((s) => estadoVisualSemana(estado, s) === 'passada');
    return passadas.length; // ciclo ainda não começou ou já terminou
  }

  function render(container, { cicloId }) {
    const estado = carregarEstado();
    const ciclo = estado.ciclos.find((c) => c.id === cicloId);
    const objetivo = estado.objetivos.find((o) => o.id === ciclo.objetivo_id);
    const semanas = estado.semanas
      .filter((s) => s.ciclo_id === ciclo.id)
      .sort((a, b) => a.numero - b.numero);

    const numeroAtual = semanaAtualNumero(estado, semanas);

    container.innerHTML = `
      <div class="tela tela-visao-ciclo">
        <div class="cabecalho-ciclo">
          <h1>${objetivo.tipo}${objetivo.meta ? ' · ' + objetivo.meta : ''}</h1>
          <p class="detalhes-ciclo">${ciclo.duracao_semanas} semanas · início em ${formatarData(ciclo.data_inicio)}</p>
          ${ciclo.meta_volume_semanal_km ? `<p class="detalhes-ciclo">Meta de volume: ${ciclo.meta_volume_semanal_km} km/semana</p>` : ''}
          <div class="barra-progresso">
            <div class="barra-progresso-preenchida" style="width:${Math.min(100, (numeroAtual / ciclo.duracao_semanas) * 100)}%"></div>
          </div>
          <p class="progresso-texto">Semana ${Math.max(numeroAtual, 0)} de ${ciclo.duracao_semanas}</p>
        </div>

        <div class="lista-semanas">
          ${semanas.map((semana) => renderCardSemana(estado, semana, semanas, ciclo.meta_volume_semanal_km)).join('')}
        </div>

        <button class="btn btn-secundario" id="btn-editar-ciclo">Editar objetivo e ciclo</button>
        <button class="btn btn-secundario" id="btn-editar-faixas">Editar faixas de ritmo</button>
      </div>
    `;

    container.querySelector('#btn-editar-ciclo').addEventListener('click', () => {
      Router.ir('editar-ciclo', { cicloId: ciclo.id });
    });

    container.querySelector('#btn-editar-faixas').addEventListener('click', () => {
      Router.ir('onboarding', { retornoCicloId: ciclo.id });
    });

    container.querySelectorAll('[data-ir-semana]').forEach((el) => {
      el.addEventListener('click', () => {
        Router.ir('visao-semana', { semanaId: el.dataset.irSemana, cicloId: ciclo.id });
      });
    });

    container.querySelectorAll('[data-duplicar]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const estadoAtual = carregarEstado();
        duplicarSemana(estadoAtual, btn.dataset.duplicar, btn.dataset.origem);
        salvarEstado(estadoAtual);
        render(container, { cicloId });
      });
    });
  }

  function renderCardSemana(estado, semana, todasSemanas, metaVolumeSemanalKm) {
    const dias = diasDaSemana(estado, semana.id);
    const status = estadoVisualSemana(estado, semana);
    const volume = somarVolumeSemana(estado, semana.id);
    const realizado = somarVolumeRealizadoSemana(estado, semana.id);
    const intervaloDatas = `${formatarData(dias[0].data)} – ${formatarData(dias[dias.length - 1].data)}`;
    const anterior = todasSemanas.find((s) => s.numero === semana.numero - 1);

    const classesEstado = {
      passada: 'semana-passada',
      atual: 'semana-atual',
      futura_planejada: 'semana-futura-planejada',
      futura_vazia: 'semana-futura-vazia',
    }[status];

    const badge = status === 'atual' ? '<span class="badge-atual">Semana atual</span>' : '';

    if (status === 'futura_vazia') {
      return `
        <div class="card-semana ${classesEstado} clicavel" data-ir-semana="${semana.id}">
          <div class="card-semana-info">
            <strong>Semana ${semana.numero}</strong>
            <span>${intervaloDatas}</span>
          </div>
          ${anterior ? `<button class="btn btn-secundario" data-duplicar="${semana.id}" data-origem="${anterior.id}">Duplicar semana ${anterior.numero}</button>` : ''}
        </div>
      `;
    }

    const clicavel = status !== 'passada';
    return `
      <div class="card-semana ${classesEstado} ${clicavel ? 'clicavel' : ''}" ${clicavel ? `data-ir-semana="${semana.id}"` : ''}>
        <div class="card-semana-info">
          <strong>Semana ${semana.numero}</strong> ${badge}
          <span>${intervaloDatas}</span>
        </div>
        <div class="card-semana-volume">
          <div class="linha-comparacao-volume">
            ${metaVolumeSemanalKm ? `<div class="item-volume"><span class="rotulo-volume">Meta</span><span>${metaVolumeSemanalKm} km</span></div>` : ''}
            <div class="item-volume"><span class="rotulo-volume">Planejado</span><span>${volume.km.toFixed(1)} km</span></div>
            <div class="item-volume"><span class="rotulo-volume">Realizado</span><span>${realizado.nTreinos > 0 ? realizado.km.toFixed(1) + ' km' : '—'}</span></div>
          </div>
          <span>${formatarMin(volume.min)} planejados · ${volume.nTreinos} treino${volume.nTreinos === 1 ? '' : 's'}</span>
          ${metaVolumeSemanalKm ? renderDeltaVolume(volume.km, metaVolumeSemanalKm) : ''}
        </div>
      </div>
    `;
  }

  function renderDeltaVolume(kmReal, metaKm) {
    const { diff, texto } = deltaVolumeSemana(kmReal, metaKm);
    const classe = Math.abs(diff) < 0.05 ? '' : diff > 0 ? 'delta-positivo' : 'delta-negativo';
    return `<span class="${classe}">${texto}</span>`;
  }

  return { render };
})();

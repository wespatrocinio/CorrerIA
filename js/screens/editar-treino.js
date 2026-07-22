// Tela 5 — Editar treino (blocos), seção 6 da spec.
// Edições ficam num rascunho em memória; só vão para o localStorage no "Salvar treino".
const ScreenEditarTreino = (() => {
  const TIPOS_TREINO = ['Regenerativo', 'Rodagem leve', 'Tempo run', 'Longo', 'Fartlek', 'VO2', 'Customizado'];
  const NIVEIS_INTENSIDADE = [
    { nivel: 'aquecimento_desaquecimento', label: 'Aquec./Desaq.' },
    { nivel: 'leve', label: 'Leve' },
    { nivel: 'moderado', label: 'Moderado' },
    { nivel: 'forte', label: 'Forte' },
    { nivel: 'muito_forte', label: 'Muito forte' },
  ];

  let draft = null; // { diaId, treino, blocos } — só existe em memória até salvar

  function paceParaVelocidade(paceMinPorKm) {
    const [m, s] = paceMinPorKm.split(':').map(Number);
    const totalMin = m + s / 60;
    return (60 / totalMin).toFixed(1);
  }

  function blocoPadrao(tipo, valor, unidade, intensidade) {
    return { id: uuid(), tipo, duracao: { valor, unidade }, intensidade, intensidade_congelada: null };
  }

  function criarBlocosPadrao(treinoId, template) {
    if (template === 'bloco_unico') {
      return [{ ...blocoPadrao('principal', 5, 'km', 'leve'), ordem: 1, treino_id: treinoId }];
    }
    if (template === 'aquecimento_principal_desaquecimento') {
      return [
        { ...blocoPadrao('aquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 1, treino_id: treinoId },
        { ...blocoPadrao('principal', 20, 'min', 'forte'), ordem: 2, treino_id: treinoId },
        { ...blocoPadrao('desaquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 3, treino_id: treinoId },
      ];
    }
    if (template === 'aquecimento_loop_desaquecimento') {
      return [
        { ...blocoPadrao('aquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 1, treino_id: treinoId },
        {
          id: uuid(), tipo: 'repeticao', ordem: 2, treino_id: treinoId,
          duracao: { valor: 0, unidade: 'min' }, intensidade: null, intensidade_congelada: null,
          repeticoes: 6,
          subBlocos: [
            blocoPadrao('principal', 1, 'min', 'muito_forte'),
            blocoPadrao('recuperacao', 1, 'min', 'leve'),
          ],
        },
        { ...blocoPadrao('desaquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 3, treino_id: treinoId },
      ];
    }
    return []; // customizado começa vazio
  }

  // Estado real + rascunho sobreposto — permite reusar as funções de leitura de models.js sem persistir nada.
  function estadoComRascunho(estado) {
    return { ...estado, treinos: [draft.treino], blocos: draft.blocos };
  }

  function render(container, { diaId, semanaId, cicloId }) {
    const estado = carregarEstado();
    const dia = estado.dias.find((d) => d.id === diaId);

    if (!draft || draft.diaId !== diaId) {
      const treinoExistente = treinoDoDia(estado, diaId);
      draft = treinoExistente
        ? { diaId, treino: { ...treinoExistente }, blocos: JSON.parse(JSON.stringify(blocosDoTreino(estado, treinoExistente.id))) }
        : { diaId, treino: null, blocos: [] };
    }

    if (!draft.treino) {
      renderEscolhaTipo(container, estado, dia, semanaId, cicloId);
      return;
    }

    renderEditorBlocos(container, estado, dia, semanaId, cicloId);
  }

  function renderEscolhaTipo(container, estado, dia, semanaId, cicloId) {
    const jaTinhaTreino = !!treinoDoDia(estado, dia.id);
    container.innerHTML = `
      <div class="tela tela-escolha-tipo">
        <h1>${formatarData(dia.data)} · ${jaTinhaTreino ? 'Trocar tipo de treino' : 'Novo treino'}</h1>
        <p class="subtitulo">Escolha o tipo de treino do dia</p>
        <div class="chips chips-coluna" id="chips-tipo-treino">
          ${TIPOS_TREINO.map((t) => `<button type="button" class="chip" data-tipo="${t}">${t}</button>`).join('')}
        </div>
        <button class="btn btn-secundario" id="btn-voltar-semana">Voltar sem salvar</button>
      </div>
    `;

    container.querySelector('#btn-voltar-semana').addEventListener('click', () => {
      draft = null;
      Router.ir('visao-semana', { semanaId, cicloId });
    });

    container.querySelector('#chips-tipo-treino').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const tipo = btn.dataset.tipo;
      const template = TEMPLATES_POR_TIPO[tipo];
      const contextoAnterior = draft.treino ? draft.treino.contexto : 'rua';
      const treinoId = uuid();
      draft = {
        diaId: dia.id,
        treino: { id: treinoId, dia_id: dia.id, tipo, template_estrutural: template, contexto: contextoAnterior, status: 'planejado' },
        blocos: criarBlocosPadrao(treinoId, template),
      };
      render(container, { diaId: dia.id, semanaId, cicloId });
    });
  }

  function renderEditorBlocos(container, estado, dia, semanaId, cicloId) {
    const estadoOverlay = estadoComRascunho(estado);
    const treino = draft.treino;
    const blocos = blocosDoTreino(estadoOverlay, treino.id);
    const total = totalTreino(estadoOverlay, treino.id);

    container.innerHTML = `
      <div class="tela tela-editar-treino">
        <div class="cabecalho-treino">
          <div>
            <h1>${formatarData(dia.data)}</h1>
            <span>${treino.tipo}</span>
            <button type="button" class="link-trocar-tipo" id="btn-trocar-tipo">Trocar tipo de treino</button>
          </div>
          <div class="seletor-contexto">
            <button type="button" class="chip ${treino.contexto === 'rua' ? 'chip-selecionado' : ''}" data-contexto="rua">Rua (ritmo)</button>
            <button type="button" class="chip ${treino.contexto === 'esteira' ? 'chip-selecionado' : ''}" data-contexto="esteira">Esteira (velocidade)</button>
          </div>
        </div>

        <div class="lista-blocos" id="lista-blocos">
          ${blocos.map((b) => renderCardBloco(estadoOverlay, treino, b)).join('')}
        </div>

        ${treino.template_estrutural === 'customizado' ? '<button class="btn btn-secundario" id="btn-add-bloco">+ Adicionar bloco</button>' : ''}

        <div class="rodape-treino">
          <span>${total.km.toFixed(1)} km</span>
          <span>${formatarMin(total.min)}</span>
        </div>

        <div class="secao-observacoes">
          <label class="rotulo-campo" for="input-observacoes">Observações</label>
          <textarea id="input-observacoes" rows="3" placeholder="Anotações sobre o treino...">${treino.observacoes || ''}</textarea>
        </div>

        ${renderSecaoRealizacao(treino)}

        <button class="btn btn-primario" id="btn-salvar-treino">Salvar treino</button>
        <button class="btn btn-secundario" id="btn-voltar-semana">Voltar sem salvar</button>
      </div>
    `;

    const rerender = () => render(container, { diaId: dia.id, semanaId, cicloId });

    container.querySelector('#btn-voltar-semana').addEventListener('click', () => {
      draft = null;
      Router.ir('visao-semana', { semanaId, cicloId });
    });

    container.querySelector('#btn-trocar-tipo').addEventListener('click', () => {
      draft.treino = null;
      draft.blocos = [];
      rerender();
    });

    container.querySelector('.seletor-contexto').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      draft.treino.contexto = btn.dataset.contexto;
      rerender();
    });

    if (treino.template_estrutural === 'customizado') {
      container.querySelector('#btn-add-bloco').addEventListener('click', () => {
        const ordemMax = Math.max(0, ...draft.blocos.map((b) => b.ordem));
        draft.blocos.push({ ...blocoPadrao('principal', 1, 'km', 'leve'), ordem: ordemMax + 1, treino_id: treino.id });
        rerender();
      });
    }

    ligarEventosBlocos(container, rerender);
    ligarEventosRealizacao(container, rerender);

    container.querySelector('#input-observacoes').addEventListener('change', (e) => {
      draft.treino.observacoes = e.target.value.trim() || null;
    });

    container.querySelector('#btn-salvar-treino').addEventListener('click', () => {
      const estadoAtual = carregarEstado();
      const treinoAntigo = treinoDoDia(estadoAtual, dia.id);
      if (treinoAntigo) {
        estadoAtual.treinos = estadoAtual.treinos.filter((t) => t.id !== treinoAntigo.id);
        estadoAtual.blocos = estadoAtual.blocos.filter((b) => b.treino_id !== treinoAntigo.id);
      }
      estadoAtual.treinos.push(draft.treino);
      draft.blocos.forEach((b) => estadoAtual.blocos.push(b));
      salvarEstado(estadoAtual);
      draft = null;
      Router.ir('visao-semana', { semanaId, cicloId });
    });
  }

  function renderSecaoRealizacao(treino) {
    const realizado = treino.status === 'realizado';
    return `
      <div class="secao-realizacao">
        <label class="checkbox-realizado">
          <input type="checkbox" id="chk-realizado" ${realizado ? 'checked' : ''} />
          Marcar como realizado
        </label>
        ${realizado ? `
          <div class="campos-realizacao">
            <label class="rotulo-campo">Como foi, comparado ao planejado?</label>
            <div class="chips" id="chips-categoria-realizacao">
              ${CATEGORIAS_REALIZACAO.map((c) => `<button type="button" class="chip ${treino.realizacao_categoria === c.valor ? 'chip-selecionado' : ''}" data-categoria="${c.valor}">${c.label}</button>`).join('')}
            </div>
            <label class="rotulo-campo" for="input-km-realizado">Km realizada (opcional)</label>
            <input type="number" min="0" step="0.1" id="input-km-realizado" placeholder="ex: 10" value="${treino.km_realizado != null ? treino.km_realizado : ''}" />
            <label class="rotulo-campo" for="input-link-registro">Link do registro — Strava, Garmin Connect etc. (opcional)</label>
            <input type="text" id="input-link-registro" placeholder="https://..." value="${treino.link_registro || ''}" />
          </div>
        ` : ''}
      </div>
    `;
  }

  function ligarEventosRealizacao(container, rerender) {
    container.querySelector('#chk-realizado').addEventListener('change', (e) => {
      draft.treino.status = e.target.checked ? 'realizado' : 'planejado';
      rerender();
    });

    const chipsCategoria = container.querySelector('#chips-categoria-realizacao');
    if (chipsCategoria) {
      chipsCategoria.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        draft.treino.realizacao_categoria = btn.dataset.categoria;
        rerender();
      });
    }

    const inputKm = container.querySelector('#input-km-realizado');
    if (inputKm) {
      inputKm.addEventListener('change', () => {
        const valor = parseFloat(inputKm.value);
        draft.treino.km_realizado = isNaN(valor) ? null : valor;
      });
    }

    const inputLink = container.querySelector('#input-link-registro');
    if (inputLink) {
      inputLink.addEventListener('change', () => {
        draft.treino.link_registro = inputLink.value.trim() || null;
      });
    }
  }

  function labelTipoBloco(tipo) {
    return { aquecimento: 'Aquecimento', principal: 'Principal', recuperacao: 'Recuperação', desaquecimento: 'Desaquecimento', repeticao: 'Repetição' }[tipo] || tipo;
  }

  function textoIntervalo(estado, treino, nivel) {
    if (!nivel) return '';
    const paceCentral = faixaDoCorredor(estado.corredor, nivel);
    const intervalo = calcularIntervalo(paceCentral);
    if (treino.contexto === 'esteira') {
      const min = paceParaVelocidade(intervalo.max);
      const max = paceParaVelocidade(intervalo.min);
      return `${min}–${max} km/h`;
    }
    return `${intervalo.min}–${intervalo.max}/km`;
  }

  function renderCardBloco(estado, treino, bloco) {
    const podeRemover = treino.template_estrutural === 'customizado';
    if (bloco.tipo === 'repeticao') {
      return `
        <div class="card-bloco card-repeticao" data-bloco-id="${bloco.id}">
          <div class="card-bloco-titulo">
            ${podeRemover
              ? `<input type="text" class="input-nome-bloco" data-bloco-id="${bloco.id}" value="${bloco.nome || 'Repetição'}" />`
              : 'Repetição'}
            ${podeRemover ? `<button class="btn-remover-bloco" data-remover="${bloco.id}">×</button>` : ''}
          </div>
          <label>Nº de séries</label>
          <input type="number" min="1" class="input-repeticoes" data-bloco-id="${bloco.id}" value="${bloco.repeticoes}" />
          ${bloco.subBlocos.map((sb, i) => `
            <div class="sub-bloco" data-sub-indice="${i}" data-bloco-pai="${bloco.id}">
              <strong>${i === 0 ? 'Tiro' : 'Recuperação'}</strong>
              <div class="linha-duracao">
                <input type="number" min="0" step="0.1" class="input-duracao-valor" data-bloco-pai="${bloco.id}" data-sub-indice="${i}" value="${sb.duracao.valor}" />
                <select class="input-duracao-unidade" data-bloco-pai="${bloco.id}" data-sub-indice="${i}">
                  <option value="km" ${sb.duracao.unidade === 'km' ? 'selected' : ''}>km</option>
                  <option value="min" ${sb.duracao.unidade === 'min' ? 'selected' : ''}>min</option>
                </select>
              </div>
              <div class="seletor-intensidade" data-bloco-pai="${bloco.id}" data-sub-indice="${i}">
                ${NIVEIS_INTENSIDADE.map((n) => `<button type="button" class="chip chip-intensidade ${sb.intensidade === n.nivel ? 'chip-selecionado' : ''}" data-nivel="${n.nivel}">${n.label}</button>`).join('')}
              </div>
              <div class="intervalo-intensidade">${textoIntervalo(estado, treino, sb.intensidade)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="card-bloco" data-bloco-id="${bloco.id}">
        <div class="card-bloco-titulo">
          ${podeRemover
            ? `<input type="text" class="input-nome-bloco" data-bloco-id="${bloco.id}" value="${bloco.nome || labelTipoBloco(bloco.tipo)}" />`
            : labelTipoBloco(bloco.tipo)}
          ${podeRemover ? `<button class="btn-remover-bloco" data-remover="${bloco.id}">×</button>` : ''}
        </div>
        <div class="linha-duracao">
          <input type="number" min="0" step="0.1" class="input-duracao-valor" data-bloco-id="${bloco.id}" value="${bloco.duracao.valor}" />
          <select class="input-duracao-unidade" data-bloco-id="${bloco.id}">
            <option value="km" ${bloco.duracao.unidade === 'km' ? 'selected' : ''}>km</option>
            <option value="min" ${bloco.duracao.unidade === 'min' ? 'selected' : ''}>min</option>
          </select>
        </div>
        ${bloco.intensidade_congelada ? `<div class="aviso-congelado">Congelado em ${bloco.intensidade_congelada}/km (dia já passou)</div>` : `
          <div class="seletor-intensidade" data-bloco-id="${bloco.id}">
            ${NIVEIS_INTENSIDADE.map((n) => `<button type="button" class="chip chip-intensidade ${bloco.intensidade === n.nivel ? 'chip-selecionado' : ''}" data-nivel="${n.nivel}">${n.label}</button>`).join('')}
          </div>
          <div class="intervalo-intensidade">${textoIntervalo(estado, treino, bloco.intensidade)}</div>
        `}
      </div>
    `;
  }

  function ligarEventosBlocos(container, rerender) {
    container.querySelectorAll('.btn-remover-bloco').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.blocos = draft.blocos.filter((b) => b.id !== btn.dataset.remover);
        rerender();
      });
    });

    container.querySelectorAll('.input-nome-bloco').forEach((input) => {
      input.addEventListener('change', () => {
        const bloco = draft.blocos.find((b) => b.id === input.dataset.blocoId);
        bloco.nome = input.value.trim();
        rerender();
      });
    });

    container.querySelectorAll('.input-duracao-valor[data-bloco-id]').forEach((input) => {
      input.addEventListener('change', () => {
        const bloco = draft.blocos.find((b) => b.id === input.dataset.blocoId);
        bloco.duracao.valor = parseFloat(input.value) || 0;
        rerender();
      });
    });
    container.querySelectorAll('.input-duracao-unidade[data-bloco-id]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const bloco = draft.blocos.find((b) => b.id === sel.dataset.blocoId);
        bloco.duracao.unidade = sel.value;
        rerender();
      });
    });

    container.querySelectorAll('.input-repeticoes').forEach((input) => {
      input.addEventListener('change', () => {
        const bloco = draft.blocos.find((b) => b.id === input.dataset.blocoId);
        bloco.repeticoes = parseInt(input.value, 10) || 1;
        rerender();
      });
    });

    container.querySelectorAll('.seletor-intensidade[data-bloco-id]').forEach((wrap) => {
      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-intensidade');
        if (!btn) return;
        const bloco = draft.blocos.find((b) => b.id === wrap.dataset.blocoId);
        bloco.intensidade = btn.dataset.nivel;
        rerender();
      });
    });

    container.querySelectorAll('.input-duracao-valor[data-bloco-pai]').forEach((input) => {
      input.addEventListener('change', () => {
        const bloco = draft.blocos.find((b) => b.id === input.dataset.blocoPai);
        bloco.subBlocos[parseInt(input.dataset.subIndice, 10)].duracao.valor = parseFloat(input.value) || 0;
        rerender();
      });
    });
    container.querySelectorAll('.input-duracao-unidade[data-bloco-pai]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const bloco = draft.blocos.find((b) => b.id === sel.dataset.blocoPai);
        bloco.subBlocos[parseInt(sel.dataset.subIndice, 10)].duracao.unidade = sel.value;
        rerender();
      });
    });
    container.querySelectorAll('.seletor-intensidade[data-bloco-pai]').forEach((wrap) => {
      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-intensidade');
        if (!btn) return;
        const bloco = draft.blocos.find((b) => b.id === wrap.dataset.blocoPai);
        bloco.subBlocos[parseInt(wrap.dataset.subIndice, 10)].intensidade = btn.dataset.nivel;
        rerender();
      });
    });
  }

  return { render };
})();

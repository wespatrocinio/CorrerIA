"""Regras de negócio — porte de CorrerIA/js/models.js e das telas do protótipo.

Funções puras (ou que recebem a `Session` explicitamente) para ficarem fáceis de
testar sem precisar subir o servidor HTTP.
"""
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from sqlmodel import Session, select

from .models import Bloco, Ciclo, Corredor, Dia, Objetivo, Semana, Treino, gen_uuid
from .schemas import BlocoInput, BlocoOutput

DIAS_POR_SEMANA = 7

TEMPLATES_POR_TIPO = {
    "Regenerativo": "bloco_unico",
    "Rodagem leve": "bloco_unico",
    "Longo": "bloco_unico",
    "Tempo run": "aquecimento_principal_desaquecimento",
    "Fartlek": "aquecimento_loop_desaquecimento",
    "VO2": "aquecimento_loop_desaquecimento",
    "Customizado": "customizado",
}

CAMPO_FAIXA = {
    "aquecimento_desaquecimento": "faixa_aquecimento_desaquecimento",
    "leve": "faixa_leve",
    "moderado": "faixa_moderado",
    "forte": "faixa_forte",
    "muito_forte": "faixa_muito_forte",
}


# --- Faixas de ritmo ---

def faixa_do_corredor(corredor: Corredor, nivel: Optional[str]) -> Optional[str]:
    campo = CAMPO_FAIXA.get(nivel) if nivel else None
    return getattr(corredor, campo) if campo else None


def calcular_intervalo(pace_min_por_km: str) -> Dict[str, str]:
    """Faixa central -> intervalo ±10s, calculado em runtime, nunca persistido."""
    minutos, segundos = pace_min_por_km.split(":")
    total_seg = int(minutos) * 60 + int(segundos)

    def formatar(s: int) -> str:
        m, sec = divmod(s, 60)
        return f"{m}:{sec:02d}"

    return {"min": formatar(total_seg - 10), "max": formatar(total_seg + 10)}


# --- Geração de semanas/dias a partir de data_inicio ---

def gerar_dias_do_ciclo(session: Session, ciclo: Ciclo) -> None:
    for n in range(1, ciclo.duracao_semanas + 1):
        semana = Semana(ciclo_id=ciclo.id, numero=n)
        session.add(semana)
        session.flush()  # garante semana.id antes de criar os dias
        inicio_semana = ciclo.data_inicio + timedelta(days=(n - 1) * DIAS_POR_SEMANA)
        for i in range(DIAS_POR_SEMANA):
            session.add(Dia(semana_id=semana.id, data=inicio_semana + timedelta(days=i)))


# --- Mudar data de início do ciclo sem perder treinos já planejados ---

def mudar_data_inicio_ciclo(session: Session, ciclo: Ciclo, nova_data_inicio: date) -> None:
    delta = (nova_data_inicio - ciclo.data_inicio).days
    if delta == 0:
        return
    semana_ids = [s.id for s in session.exec(select(Semana).where(Semana.ciclo_id == ciclo.id)).all()]
    dias = session.exec(select(Dia).where(Dia.semana_id.in_(semana_ids))).all()
    for dia in dias:
        dia.data = dia.data + timedelta(days=delta)
        session.add(dia)
    ciclo.data_inicio = nova_data_inicio
    session.add(ciclo)


# --- Blocos padrão por template (criação de treino novo) ---

def _bloco_padrao(tipo: str, valor: float, unidade: str, intensidade: Optional[str], treino_id: str, ordem: int,
                   parent_bloco_id: Optional[str] = None) -> Bloco:
    return Bloco(
        treino_id=treino_id, parent_bloco_id=parent_bloco_id, ordem=ordem, tipo=tipo,
        duracao_valor=valor, duracao_unidade=unidade, intensidade=intensidade,
    )


def criar_blocos_padrao(treino_id: str, template: str) -> List[Bloco]:
    if template == "bloco_unico":
        return [_bloco_padrao("principal", 5, "km", "leve", treino_id, 1)]

    if template == "aquecimento_principal_desaquecimento":
        return [
            _bloco_padrao("aquecimento", 10, "min", "aquecimento_desaquecimento", treino_id, 1),
            _bloco_padrao("principal", 20, "min", "forte", treino_id, 2),
            _bloco_padrao("desaquecimento", 10, "min", "aquecimento_desaquecimento", treino_id, 3),
        ]

    if template == "aquecimento_loop_desaquecimento":
        aquecimento = _bloco_padrao("aquecimento", 10, "min", "aquecimento_desaquecimento", treino_id, 1)
        repeticao = Bloco(treino_id=treino_id, ordem=2, tipo="repeticao", duracao_valor=0, duracao_unidade="min", repeticoes=6)
        tiro = _bloco_padrao("principal", 1, "min", "muito_forte", treino_id, 1, parent_bloco_id=repeticao.id)
        recuperacao = _bloco_padrao("recuperacao", 1, "min", "leve", treino_id, 2, parent_bloco_id=repeticao.id)
        desaquecimento = _bloco_padrao("desaquecimento", 10, "min", "aquecimento_desaquecimento", treino_id, 3)
        return [aquecimento, repeticao, tiro, recuperacao, desaquecimento]

    return []  # customizado começa vazio


# --- Conversão de BlocoInput (API) <-> Bloco (ORM) ---

def blocos_input_para_orm(treino_id: str, blocos_input: List[BlocoInput],
                           mapa_congelado: Optional[Dict[str, Optional[str]]] = None) -> List[Bloco]:
    """Achata os BlocoInput (com sub_blocos aninhados) em linhas de Bloco.
    Preserva intensidade_congelada dos blocos que já existiam (por id) — o cliente
    não manda esse campo de volta, então sem isso o congelamento se perderia a cada save.
    """
    mapa_congelado = mapa_congelado or {}
    resultado: List[Bloco] = []
    for b in blocos_input:
        bloco_id = b.id or gen_uuid()
        resultado.append(Bloco(
            id=bloco_id, treino_id=treino_id, parent_bloco_id=None, ordem=b.ordem, tipo=b.tipo,
            nome=b.nome, duracao_valor=b.duracao_valor, duracao_unidade=b.duracao_unidade,
            intensidade=b.intensidade, intensidade_congelada=mapa_congelado.get(bloco_id),
            repeticoes=b.repeticoes,
        ))
        for sb in b.sub_blocos:
            sb_id = sb.id or gen_uuid()
            resultado.append(Bloco(
                id=sb_id, treino_id=treino_id, parent_bloco_id=bloco_id, ordem=sb.ordem, tipo=sb.tipo,
                nome=sb.nome, duracao_valor=sb.duracao_valor, duracao_unidade=sb.duracao_unidade,
                intensidade=sb.intensidade, intensidade_congelada=mapa_congelado.get(sb_id),
                repeticoes=sb.repeticoes,
            ))
    return resultado


def serializar_blocos(blocos: List[Bloco]) -> List[BlocoOutput]:
    raizes = sorted([b for b in blocos if b.parent_bloco_id is None], key=lambda b: b.ordem)

    def _serializar(b: Bloco, subs: List[Bloco]) -> BlocoOutput:
        return BlocoOutput(
            id=b.id, ordem=b.ordem, tipo=b.tipo, nome=b.nome,
            duracao_valor=b.duracao_valor, duracao_unidade=b.duracao_unidade,
            intensidade=b.intensidade, intensidade_congelada=b.intensidade_congelada,
            repeticoes=b.repeticoes,
            sub_blocos=[_serializar(sb, []) for sb in sorted(subs, key=lambda sb: sb.ordem)],
        )

    return [_serializar(b, [sb for sb in blocos if sb.parent_bloco_id == b.id]) for b in raizes]


# --- Cálculo de volume (km/min) ---

def _pace_decimal_do_bloco(corredor: Corredor, bloco: Bloco) -> Optional[float]:
    pace_str = bloco.intensidade_congelada or (faixa_do_corredor(corredor, bloco.intensidade) if bloco.intensidade else None)
    if not pace_str:
        return None
    m, s = pace_str.split(":")
    return int(m) + int(s) / 60


def _duracao_bloco_em_km_min(corredor: Corredor, bloco: Bloco, sub_blocos: Optional[List[Bloco]]) -> Tuple[float, float]:
    km = 0.0
    minutos = 0.0

    def somar(b: Bloco) -> None:
        nonlocal km, minutos
        pace = _pace_decimal_do_bloco(corredor, b)
        if b.duracao_unidade == "km":
            km += b.duracao_valor
            if pace:
                minutos += b.duracao_valor * pace
        else:
            minutos += b.duracao_valor
            if pace:
                km += b.duracao_valor / pace

    if bloco.tipo == "repeticao" and sub_blocos:
        for _ in range(bloco.repeticoes or 0):
            for sb in sub_blocos:
                somar(sb)
    else:
        somar(bloco)

    return km, minutos


def total_treino(corredor: Corredor, blocos: List[Bloco]) -> Tuple[float, float]:
    raizes = [b for b in blocos if b.parent_bloco_id is None]
    total_km = 0.0
    total_min = 0.0
    for b in raizes:
        subs = [sb for sb in blocos if sb.parent_bloco_id == b.id] if b.tipo == "repeticao" else None
        km, minutos = _duracao_bloco_em_km_min(corredor, b, subs)
        total_km += km
        total_min += minutos
    return total_km, total_min


def km_realizado_treino(corredor: Corredor, treino: Treino, blocos: List[Bloco]) -> float:
    if treino.km_realizado is not None:
        return treino.km_realizado
    km, _ = total_treino(corredor, blocos)
    return km


# --- Volumes agregados por semana (planejado + realizado) ---

def volumes_semana(session: Session, corredor: Corredor, semana: Semana) -> dict:
    dias = session.exec(select(Dia).where(Dia.semana_id == semana.id).order_by(Dia.data)).all()
    km_planejado = 0.0
    min_planejado = 0.0
    km_realizado = 0.0
    n_treinos = 0
    tem_treino = False

    for dia in dias:
        treino = session.exec(select(Treino).where(Treino.dia_id == dia.id)).first()
        if not treino:
            continue
        tem_treino = True
        n_treinos += 1
        blocos = session.exec(select(Bloco).where(Bloco.treino_id == treino.id)).all()
        km, minutos = total_treino(corredor, blocos)
        km_planejado += km
        min_planejado += minutos
        if treino.status == "realizado":
            km_realizado += km_realizado_treino(corredor, treino, blocos)

    return {
        "dias": dias,
        "km_planejado": km_planejado,
        "min_planejado": min_planejado,
        "km_realizado": km_realizado,
        "n_treinos": n_treinos,
        "tem_treino": tem_treino,
    }


def estado_visual_semana(dias: List[Dia], tem_treino: bool) -> str:
    hoje = date.today()
    primeiro = dias[0].data
    ultimo = dias[-1].data
    if ultimo < hoje:
        return "passada"
    if primeiro <= hoje <= ultimo:
        return "atual"
    return "futura_planejada" if tem_treino else "futura_vazia"


# --- Congelamento de intensidade ---

def congelar_intensidades_passadas(session: Session, corredor: Corredor) -> None:
    """Roda ANTES de aplicar novos valores de faixa no corredor — congela com o
    valor que estava valendo até então, para dias já passados."""
    hoje = date.today()

    objetivo_ids = [o.id for o in session.exec(select(Objetivo).where(Objetivo.corredor_id == corredor.id)).all()]
    if not objetivo_ids:
        return
    ciclo_ids = [c.id for c in session.exec(select(Ciclo).where(Ciclo.objetivo_id.in_(objetivo_ids))).all()]
    if not ciclo_ids:
        return
    semana_ids = [s.id for s in session.exec(select(Semana).where(Semana.ciclo_id.in_(ciclo_ids))).all()]
    if not semana_ids:
        return
    dia_ids = [
        d.id for d in session.exec(select(Dia).where(Dia.semana_id.in_(semana_ids), Dia.data < hoje)).all()
    ]
    if not dia_ids:
        return
    treino_ids = [t.id for t in session.exec(select(Treino).where(Treino.dia_id.in_(dia_ids))).all()]
    if not treino_ids:
        return

    blocos = session.exec(select(Bloco).where(Bloco.treino_id.in_(treino_ids))).all()
    for bloco in blocos:
        if bloco.intensidade_congelada or not bloco.intensidade:
            continue
        bloco.intensidade_congelada = faixa_do_corredor(corredor, bloco.intensidade)
        session.add(bloco)


# --- Duplicar semana ---

def duplicar_semana(session: Session, semana_destino: Semana, semana_origem: Semana) -> None:
    dias_destino = session.exec(select(Dia).where(Dia.semana_id == semana_destino.id).order_by(Dia.data)).all()
    dias_origem = session.exec(select(Dia).where(Dia.semana_id == semana_origem.id).order_by(Dia.data)).all()

    for dia_origem, dia_destino in zip(dias_origem, dias_destino):
        treino_origem = session.exec(select(Treino).where(Treino.dia_id == dia_origem.id)).first()
        if not treino_origem:
            continue

        novo_treino = Treino(
            dia_id=dia_destino.id, tipo=treino_origem.tipo,
            template_estrutural=treino_origem.template_estrutural, contexto=treino_origem.contexto,
            status="planejado",
        )
        session.add(novo_treino)
        session.flush()

        blocos_origem = session.exec(select(Bloco).where(Bloco.treino_id == treino_origem.id)).all()
        mapa_ids: Dict[str, str] = {}

        for b in [b for b in blocos_origem if b.parent_bloco_id is None]:
            novo = Bloco(
                treino_id=novo_treino.id, ordem=b.ordem, tipo=b.tipo, nome=b.nome,
                duracao_valor=b.duracao_valor, duracao_unidade=b.duracao_unidade,
                intensidade=b.intensidade, intensidade_congelada=None,  # semana duplicada nasce sem congelamento
                repeticoes=b.repeticoes,
            )
            session.add(novo)
            session.flush()
            mapa_ids[b.id] = novo.id

        for b in [b for b in blocos_origem if b.parent_bloco_id is not None]:
            session.add(Bloco(
                treino_id=novo_treino.id, parent_bloco_id=mapa_ids.get(b.parent_bloco_id),
                ordem=b.ordem, tipo=b.tipo, nome=b.nome,
                duracao_valor=b.duracao_valor, duracao_unidade=b.duracao_unidade,
                intensidade=b.intensidade, intensidade_congelada=None, repeticoes=b.repeticoes,
            ))

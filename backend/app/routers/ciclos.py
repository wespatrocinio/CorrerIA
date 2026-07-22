from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_corredor_atual
from ..logic import estado_visual_semana, gerar_dias_do_ciclo, mudar_data_inicio_ciclo, volumes_semana
from ..models import Ciclo, Corredor, Objetivo, Semana
from ..schemas import CicloCreateRequest, CicloResponse, CicloUpdateRequest, ObjetivoOutput, SemanaResumo

router = APIRouter()


def _serializar_ciclo(ciclo: Ciclo, objetivo: Objetivo) -> CicloResponse:
    return CicloResponse(
        id=ciclo.id,
        objetivo=ObjetivoOutput(id=objetivo.id, tipo=objetivo.tipo, meta=objetivo.meta, data_alvo=objetivo.data_alvo),
        data_inicio=ciclo.data_inicio,
        duracao_semanas=ciclo.duracao_semanas,
        meta_volume_semanal_km=ciclo.meta_volume_semanal_km,
    )


def _obter_ciclo_do_corredor(session: Session, corredor: Corredor, ciclo_id: str) -> Tuple[Ciclo, Objetivo]:
    ciclo = session.get(Ciclo, ciclo_id)
    if not ciclo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ciclo não encontrado")
    objetivo = session.get(Objetivo, ciclo.objetivo_id)
    if not objetivo or objetivo.corredor_id != corredor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ciclo não pertence a este corredor")
    return ciclo, objetivo


@router.get("", response_model=List[CicloResponse])
def listar_ciclos(corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)):
    objetivos = session.exec(select(Objetivo).where(Objetivo.corredor_id == corredor.id)).all()
    if not objetivos:
        return []
    objetivo_por_id = {o.id: o for o in objetivos}
    ciclos = session.exec(
        select(Ciclo).where(Ciclo.objetivo_id.in_(list(objetivo_por_id.keys()))).order_by(Ciclo.criado_em)
    ).all()
    return [_serializar_ciclo(c, objetivo_por_id[c.objetivo_id]) for c in ciclos]


@router.post("", response_model=CicloResponse, status_code=status.HTTP_201_CREATED)
def criar_ciclo(
    dados: CicloCreateRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    objetivo = Objetivo(
        corredor_id=corredor.id, tipo=dados.objetivo.tipo, meta=dados.objetivo.meta, data_alvo=dados.objetivo.data_alvo
    )
    session.add(objetivo)
    session.flush()

    ciclo = Ciclo(
        objetivo_id=objetivo.id,
        data_inicio=dados.data_inicio,
        duracao_semanas=dados.duracao_semanas,
        meta_volume_semanal_km=dados.meta_volume_semanal_km,
    )
    session.add(ciclo)
    session.flush()

    gerar_dias_do_ciclo(session, ciclo)

    session.commit()
    session.refresh(ciclo)
    session.refresh(objetivo)
    return _serializar_ciclo(ciclo, objetivo)


@router.get("/{ciclo_id}", response_model=CicloResponse)
def obter_ciclo(
    ciclo_id: str, corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)
):
    ciclo, objetivo = _obter_ciclo_do_corredor(session, corredor, ciclo_id)
    return _serializar_ciclo(ciclo, objetivo)


@router.put("/{ciclo_id}", response_model=CicloResponse)
def atualizar_ciclo(
    ciclo_id: str,
    dados: CicloUpdateRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    ciclo, objetivo = _obter_ciclo_do_corredor(session, corredor, ciclo_id)

    objetivo.tipo = dados.objetivo.tipo
    objetivo.meta = dados.objetivo.meta
    objetivo.data_alvo = dados.objetivo.data_alvo
    session.add(objetivo)

    # data_inicio muda via deslocamento dos dias — não regenera nada, preserva treinos (ver logic.py)
    mudar_data_inicio_ciclo(session, ciclo, dados.data_inicio)
    ciclo.meta_volume_semanal_km = dados.meta_volume_semanal_km
    session.add(ciclo)

    session.commit()
    session.refresh(ciclo)
    session.refresh(objetivo)
    return _serializar_ciclo(ciclo, objetivo)


@router.get("/{ciclo_id}/semanas", response_model=List[SemanaResumo])
def listar_semanas(
    ciclo_id: str, corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)
):
    ciclo, _ = _obter_ciclo_do_corredor(session, corredor, ciclo_id)
    semanas = session.exec(select(Semana).where(Semana.ciclo_id == ciclo.id).order_by(Semana.numero)).all()

    resultado = []
    for semana in semanas:
        vol = volumes_semana(session, corredor, semana)
        resultado.append(SemanaResumo(
            id=semana.id,
            numero=semana.numero,
            data_inicio=vol["dias"][0].data,
            data_fim=vol["dias"][-1].data,
            status=estado_visual_semana(vol["dias"], vol["tem_treino"]),
            volume_planejado_km=vol["km_planejado"],
            volume_planejado_min=vol["min_planejado"],
            volume_realizado_km=vol["km_realizado"],
            n_treinos=vol["n_treinos"],
        ))
    return resultado

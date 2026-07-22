from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_corredor_atual
from ..logic import duplicar_semana, km_realizado_treino, serializar_blocos, total_treino
from ..models import Bloco, Ciclo, Corredor, Dia, Objetivo, Semana, Treino
from ..schemas import DiaOutput, DuplicarSemanaRequest, SemanaDetalhe, TreinoOutput

router = APIRouter()


def _validar_semana_do_corredor(session: Session, corredor: Corredor, semana_id: str) -> Semana:
    semana = session.get(Semana, semana_id)
    if not semana:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semana não encontrada")
    ciclo = session.get(Ciclo, semana.ciclo_id)
    objetivo = session.get(Objetivo, ciclo.objetivo_id) if ciclo else None
    if not objetivo or objetivo.corredor_id != corredor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Semana não pertence a este corredor")
    return semana


def _serializar_semana_detalhe(session: Session, corredor: Corredor, semana: Semana) -> SemanaDetalhe:
    dias = session.exec(select(Dia).where(Dia.semana_id == semana.id).order_by(Dia.data)).all()

    dias_output = []
    km_planejado_total = 0.0
    min_planejado_total = 0.0
    km_realizado_total = 0.0

    for dia in dias:
        treino = session.exec(select(Treino).where(Treino.dia_id == dia.id)).first()
        treino_output = None
        if treino:
            blocos = session.exec(select(Bloco).where(Bloco.treino_id == treino.id)).all()
            km, minutos = total_treino(corredor, blocos)
            km_planejado_total += km
            min_planejado_total += minutos
            if treino.status == "realizado":
                km_realizado_total += km_realizado_treino(corredor, treino, blocos)
            treino_output = TreinoOutput(
                id=treino.id, tipo=treino.tipo, template_estrutural=treino.template_estrutural,
                contexto=treino.contexto, status=treino.status,
                realizacao_categoria=treino.realizacao_categoria, km_realizado=treino.km_realizado,
                link_registro=treino.link_registro, observacoes=treino.observacoes,
                total_km=km, total_min=minutos, blocos=serializar_blocos(blocos),
            )
        dias_output.append(DiaOutput(id=dia.id, data=dia.data, treino=treino_output))

    return SemanaDetalhe(
        id=semana.id, numero=semana.numero, dias=dias_output,
        volume_planejado_km=km_planejado_total, volume_planejado_min=min_planejado_total,
        volume_realizado_km=km_realizado_total,
    )


@router.get("/{semana_id}", response_model=SemanaDetalhe)
def obter_semana(
    semana_id: str, corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)
):
    semana = _validar_semana_do_corredor(session, corredor, semana_id)
    return _serializar_semana_detalhe(session, corredor, semana)


@router.post("/{semana_id}/duplicar", response_model=SemanaDetalhe)
def duplicar(
    semana_id: str,
    dados: DuplicarSemanaRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    semana_destino = _validar_semana_do_corredor(session, corredor, semana_id)
    semana_origem = _validar_semana_do_corredor(session, corredor, dados.semana_origem_id)

    duplicar_semana(session, semana_destino, semana_origem)
    session.commit()

    return _serializar_semana_detalhe(session, corredor, semana_destino)

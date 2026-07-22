from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_corredor_atual
from ..logic import TEMPLATES_POR_TIPO, blocos_input_para_orm, criar_blocos_padrao, serializar_blocos, total_treino
from ..models import Bloco, Ciclo, Corredor, Dia, Objetivo, Semana, Treino
from ..schemas import TreinoCreateRequest, TreinoOutput, TreinoUpdateRequest

router = APIRouter()


def _validar_dia_do_corredor(session: Session, corredor: Corredor, dia_id: str) -> Dia:
    dia = session.get(Dia, dia_id)
    if not dia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dia não encontrado")
    semana = session.get(Semana, dia.semana_id)
    ciclo = session.get(Ciclo, semana.ciclo_id) if semana else None
    objetivo = session.get(Objetivo, ciclo.objetivo_id) if ciclo else None
    if not objetivo or objetivo.corredor_id != corredor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dia não pertence a este corredor")
    return dia


def _validar_treino_do_corredor(session: Session, corredor: Corredor, treino_id: str) -> Treino:
    treino = session.get(Treino, treino_id)
    if not treino:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treino não encontrado")
    _validar_dia_do_corredor(session, corredor, treino.dia_id)
    return treino


def _treino_output(corredor: Corredor, treino: Treino, blocos: List[Bloco]) -> TreinoOutput:
    km, minutos = total_treino(corredor, blocos)
    return TreinoOutput(
        id=treino.id, tipo=treino.tipo, template_estrutural=treino.template_estrutural,
        contexto=treino.contexto, status=treino.status,
        realizacao_categoria=treino.realizacao_categoria, km_realizado=treino.km_realizado,
        link_registro=treino.link_registro, observacoes=treino.observacoes,
        total_km=km, total_min=minutos, blocos=serializar_blocos(blocos),
    )


@router.post("/dias/{dia_id}/treino", response_model=TreinoOutput, status_code=status.HTTP_201_CREATED)
def criar_treino(
    dia_id: str,
    dados: TreinoCreateRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    dia = _validar_dia_do_corredor(session, corredor, dia_id)

    existente = session.exec(select(Treino).where(Treino.dia_id == dia.id)).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Esse dia já tem um treino — use PUT /treinos/{id} para editar"
        )

    template = TEMPLATES_POR_TIPO.get(dados.tipo, "customizado")
    treino = Treino(dia_id=dia.id, tipo=dados.tipo, template_estrutural=template, contexto="rua", status="planejado")
    session.add(treino)
    session.flush()

    for bloco in criar_blocos_padrao(treino.id, template):
        session.add(bloco)

    session.commit()
    session.refresh(treino)
    blocos_persistidos = session.exec(select(Bloco).where(Bloco.treino_id == treino.id)).all()
    return _treino_output(corredor, treino, blocos_persistidos)


@router.get("/dias/{dia_id}/treino", response_model=Optional[TreinoOutput])
def obter_treino_do_dia(
    dia_id: str, corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)
):
    dia = _validar_dia_do_corredor(session, corredor, dia_id)
    treino = session.exec(select(Treino).where(Treino.dia_id == dia.id)).first()
    if not treino:
        return None
    blocos = session.exec(select(Bloco).where(Bloco.treino_id == treino.id)).all()
    return _treino_output(corredor, treino, blocos)


@router.put("/treinos/{treino_id}", response_model=TreinoOutput)
def atualizar_treino(
    treino_id: str,
    dados: TreinoUpdateRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    treino = _validar_treino_do_corredor(session, corredor, treino_id)

    # substitui treino + blocos por inteiro — mesmo padrão de "rascunho local, salva tudo de uma vez"
    # da Tela 5 do protótipo. Preserva intensidade_congelada dos blocos que já existiam (por id).
    blocos_antigos = session.exec(select(Bloco).where(Bloco.treino_id == treino.id)).all()
    mapa_congelado = {b.id: b.intensidade_congelada for b in blocos_antigos}
    for b in blocos_antigos:
        session.delete(b)
    session.flush()

    treino.tipo = dados.tipo
    treino.template_estrutural = dados.template_estrutural
    treino.contexto = dados.contexto
    treino.status = dados.status
    treino.realizacao_categoria = dados.realizacao_categoria
    treino.km_realizado = dados.km_realizado
    treino.link_registro = dados.link_registro
    treino.observacoes = dados.observacoes
    session.add(treino)

    for bloco in blocos_input_para_orm(treino.id, dados.blocos, mapa_congelado):
        session.add(bloco)

    session.commit()
    session.refresh(treino)
    blocos_persistidos = session.exec(select(Bloco).where(Bloco.treino_id == treino.id)).all()
    return _treino_output(corredor, treino, blocos_persistidos)

from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_corredor_atual
from ..models import Corredor, Rota, RotaTrecho, Trecho, Treino
from ..rotas_logic import validar_cadeia
from ..schemas import RotaCreateRequest, RotaOutput, RotaResumo, RotaTrechoOutput
from .trechos import _validar_trecho_do_corredor, trecho_output

router = APIRouter()


def _validar_rota_do_corredor(session: Session, corredor: Corredor, rota_id: str) -> Rota:
    rota = session.get(Rota, rota_id)
    if not rota or rota.corredor_id != corredor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rota não encontrada")
    return rota


def _itens_ordenados(session: Session, rota_id: str) -> List[RotaTrecho]:
    return session.exec(select(RotaTrecho).where(RotaTrecho.rota_id == rota_id).order_by(RotaTrecho.ordem)).all()


def rota_output(session: Session, rota: Rota) -> RotaOutput:
    itens = _itens_ordenados(session, rota.id)
    trechos_out = []
    distancia_total = 0.0
    for item in itens:
        trecho = session.get(Trecho, item.trecho_id)
        distancia_total += trecho.distancia_km
        trechos_out.append(
            RotaTrechoOutput(trecho=trecho_output(session, trecho), ordem=item.ordem, invertido=item.invertido)
        )
    return RotaOutput(id=rota.id, nome=rota.nome, trechos=trechos_out, distancia_total_km=round(distancia_total, 2))


def rota_resumo(session: Session, rota_id: Optional[str]) -> Optional[RotaResumo]:
    if not rota_id:
        return None
    rota = session.get(Rota, rota_id)
    if not rota:
        return None
    itens = _itens_ordenados(session, rota.id)
    distancia_total = sum(session.get(Trecho, i.trecho_id).distancia_km for i in itens)
    return RotaResumo(id=rota.id, nome=rota.nome, distancia_total_km=round(distancia_total, 2))


def _montar_e_validar_trechos(
    session: Session, corredor: Corredor, itens_input
) -> List[Tuple[Trecho, bool]]:
    trechos_ordenados = [
        (_validar_trecho_do_corredor(session, corredor, item.trecho_id), item.invertido) for item in itens_input
    ]
    try:
        validar_cadeia(trechos_ordenados)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return trechos_ordenados


@router.get("/rotas", response_model=List[RotaResumo])
def listar_rotas(corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)):
    rotas = session.exec(
        select(Rota).where(Rota.corredor_id == corredor.id).order_by(Rota.criado_em.desc())
    ).all()
    return [rota_resumo(session, r.id) for r in rotas]


@router.get("/rotas/{rota_id}", response_model=RotaOutput)
def obter_rota(
    rota_id: str, corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)
):
    rota = _validar_rota_do_corredor(session, corredor, rota_id)
    return rota_output(session, rota)


@router.post("/rotas", response_model=RotaOutput, status_code=status.HTTP_201_CREATED)
def criar_rota(
    dados: RotaCreateRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    trechos_ordenados = _montar_e_validar_trechos(session, corredor, dados.trechos)
    rota = Rota(corredor_id=corredor.id, nome=dados.nome)
    session.add(rota)
    session.flush()
    for i, (trecho, invertido) in enumerate(trechos_ordenados):
        session.add(RotaTrecho(rota_id=rota.id, trecho_id=trecho.id, ordem=i, invertido=invertido))
    session.commit()
    session.refresh(rota)
    return rota_output(session, rota)


@router.put("/rotas/{rota_id}", response_model=RotaOutput)
def atualizar_rota(
    rota_id: str,
    dados: RotaCreateRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    rota = _validar_rota_do_corredor(session, corredor, rota_id)
    trechos_ordenados = _montar_e_validar_trechos(session, corredor, dados.trechos)

    for item in _itens_ordenados(session, rota.id):
        session.delete(item)
    session.flush()

    rota.nome = dados.nome
    session.add(rota)
    for i, (trecho, invertido) in enumerate(trechos_ordenados):
        session.add(RotaTrecho(rota_id=rota.id, trecho_id=trecho.id, ordem=i, invertido=invertido))
    session.commit()
    session.refresh(rota)
    return rota_output(session, rota)


@router.delete("/rotas/{rota_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_rota(
    rota_id: str, corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)
):
    rota = _validar_rota_do_corredor(session, corredor, rota_id)
    for item in _itens_ordenados(session, rota.id):
        session.delete(item)

    # desvincula treinos que apontavam pra essa rota, em vez de bloquear a exclusão
    for treino in session.exec(select(Treino).where(Treino.rota_id == rota.id)).all():
        treino.rota_id = None
        session.add(treino)

    session.delete(rota)
    session.commit()

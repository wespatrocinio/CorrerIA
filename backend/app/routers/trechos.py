from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_corredor_atual
from ..models import Corredor, Ponto, RotaTrecho, Trecho
from ..schemas import PontoOutput, TrechoInput, TrechoOutput

router = APIRouter()


def _validar_trecho_do_corredor(session: Session, corredor: Corredor, trecho_id: str) -> Trecho:
    trecho = session.get(Trecho, trecho_id)
    if not trecho or trecho.corredor_id != corredor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trecho não encontrado")
    return trecho


def _validar_ponto_do_corredor(session: Session, corredor: Corredor, ponto_id: str) -> Ponto:
    ponto = session.get(Ponto, ponto_id)
    if not ponto or ponto.corredor_id != corredor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ponto não encontrado")
    return ponto


def trecho_output(session: Session, trecho: Trecho) -> TrechoOutput:
    partida = session.get(Ponto, trecho.ponto_partida_id)
    chegada = session.get(Ponto, trecho.ponto_chegada_id)
    return TrechoOutput(
        id=trecho.id,
        nome=trecho.nome,
        distancia_km=trecho.distancia_km,
        ponto_partida_id=trecho.ponto_partida_id,
        ponto_chegada_id=trecho.ponto_chegada_id,
        ponto_partida=PontoOutput(id=partida.id, nome=partida.nome),
        ponto_chegada=PontoOutput(id=chegada.id, nome=chegada.nome),
    )


@router.get("/trechos", response_model=List[TrechoOutput])
def listar_trechos(corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)):
    trechos = session.exec(select(Trecho).where(Trecho.corredor_id == corredor.id)).all()
    return [trecho_output(session, t) for t in trechos]


@router.post("/trechos", response_model=TrechoOutput, status_code=status.HTTP_201_CREATED)
def criar_trecho(
    dados: TrechoInput,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    _validar_ponto_do_corredor(session, corredor, dados.ponto_partida_id)
    _validar_ponto_do_corredor(session, corredor, dados.ponto_chegada_id)
    trecho = Trecho(corredor_id=corredor.id, **dados.dict())
    session.add(trecho)
    session.commit()
    session.refresh(trecho)
    return trecho_output(session, trecho)


@router.put("/trechos/{trecho_id}", response_model=TrechoOutput)
def atualizar_trecho(
    trecho_id: str,
    dados: TrechoInput,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    trecho = _validar_trecho_do_corredor(session, corredor, trecho_id)
    _validar_ponto_do_corredor(session, corredor, dados.ponto_partida_id)
    _validar_ponto_do_corredor(session, corredor, dados.ponto_chegada_id)
    trecho.nome = dados.nome
    trecho.ponto_partida_id = dados.ponto_partida_id
    trecho.ponto_chegada_id = dados.ponto_chegada_id
    trecho.distancia_km = dados.distancia_km
    session.add(trecho)
    session.commit()
    session.refresh(trecho)
    return trecho_output(session, trecho)


@router.delete("/trechos/{trecho_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_trecho(
    trecho_id: str,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    trecho = _validar_trecho_do_corredor(session, corredor, trecho_id)
    em_uso = session.exec(select(RotaTrecho).where(RotaTrecho.trecho_id == trecho_id)).first()
    if em_uso:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esse trecho está em uso por uma rota — remova da rota primeiro",
        )
    session.delete(trecho)
    session.commit()

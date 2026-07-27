from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_corredor_atual
from ..models import Corredor, Ponto, Trecho
from ..schemas import PontoInput, PontoOutput

router = APIRouter()


def _validar_ponto_do_corredor(session: Session, corredor: Corredor, ponto_id: str) -> Ponto:
    ponto = session.get(Ponto, ponto_id)
    if not ponto or ponto.corredor_id != corredor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ponto não encontrado")
    return ponto


@router.get("/pontos", response_model=List[PontoOutput])
def listar_pontos(corredor: Corredor = Depends(get_corredor_atual), session: Session = Depends(get_session)):
    return session.exec(select(Ponto).where(Ponto.corredor_id == corredor.id).order_by(Ponto.nome)).all()


@router.post("/pontos", response_model=PontoOutput, status_code=status.HTTP_201_CREATED)
def criar_ponto(
    dados: PontoInput,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    ponto = Ponto(corredor_id=corredor.id, nome=dados.nome)
    session.add(ponto)
    session.commit()
    session.refresh(ponto)
    return ponto


@router.put("/pontos/{ponto_id}", response_model=PontoOutput)
def atualizar_ponto(
    ponto_id: str,
    dados: PontoInput,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    ponto = _validar_ponto_do_corredor(session, corredor, ponto_id)
    ponto.nome = dados.nome
    session.add(ponto)
    session.commit()
    session.refresh(ponto)
    return ponto


@router.delete("/pontos/{ponto_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_ponto(
    ponto_id: str,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    ponto = _validar_ponto_do_corredor(session, corredor, ponto_id)
    em_uso = session.exec(
        select(Trecho).where(
            (Trecho.ponto_partida_id == ponto_id) | (Trecho.ponto_chegada_id == ponto_id)
        )
    ).first()
    if em_uso:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esse ponto está em uso por um trecho — remova o trecho primeiro",
        )
    session.delete(ponto)
    session.commit()

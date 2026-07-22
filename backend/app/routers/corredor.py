from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_user
from ..logic import congelar_intensidades_passadas
from ..models import Corredor, Usuario
from ..schemas import CorredorRequest, CorredorResponse, PerfilPessoalRequest

router = APIRouter()


@router.get("", response_model=CorredorResponse)
def obter_corredor(usuario: Usuario = Depends(get_current_user), session: Session = Depends(get_session)):
    corredor = session.exec(select(Corredor).where(Corredor.usuario_id == usuario.id)).first()
    if not corredor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corredor ainda não configurado")
    return corredor


@router.put("", response_model=CorredorResponse)
def atualizar_corredor(
    dados: CorredorRequest,
    usuario: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    corredor = session.exec(select(Corredor).where(Corredor.usuario_id == usuario.id)).first()

    if corredor:
        # Congela com o valor que estava valendo ANTES da edição do perfil (seção 4 da spec).
        congelar_intensidades_passadas(session, corredor)
        corredor.faixa_aquecimento_desaquecimento = dados.faixa_aquecimento_desaquecimento
        corredor.faixa_leve = dados.faixa_leve
        corredor.faixa_moderado = dados.faixa_moderado
        corredor.faixa_forte = dados.faixa_forte
        corredor.faixa_muito_forte = dados.faixa_muito_forte
    else:
        corredor = Corredor(usuario_id=usuario.id, **dados.dict())

    session.add(corredor)
    session.commit()
    session.refresh(corredor)
    return corredor


@router.put("/perfil", response_model=CorredorResponse)
def atualizar_perfil_pessoal(
    dados: PerfilPessoalRequest,
    usuario: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    corredor = session.exec(select(Corredor).where(Corredor.usuario_id == usuario.id)).first()
    if not corredor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Corredor ainda não configurado — chame PUT /api/corredor primeiro",
        )

    corredor.nome = dados.nome
    corredor.sobrenome = dados.sobrenome
    corredor.data_nascimento = dados.data_nascimento
    corredor.altura_cm = dados.altura_cm
    corredor.peso_kg = dados.peso_kg
    corredor.genero = dados.genero

    session.add(corredor)
    session.commit()
    session.refresh(corredor)
    return corredor

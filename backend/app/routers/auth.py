from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_user
from ..models import Usuario
from ..schemas import LoginRequest, RegistroRequest, TokenResponse, TrocarSenhaRequest
from ..security import criar_token, hash_senha, verificar_senha

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def registrar(dados: RegistroRequest, session: Session = Depends(get_session)):
    existente = session.exec(select(Usuario).where(Usuario.email == dados.email)).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

    usuario = Usuario(email=dados.email, senha_hash=hash_senha(dados.senha))
    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    return TokenResponse(access_token=criar_token(usuario.id))


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest, session: Session = Depends(get_session)):
    usuario = session.exec(select(Usuario).where(Usuario.email == dados.email)).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou senha inválidos")

    return TokenResponse(access_token=criar_token(usuario.id))


@router.put("/senha", status_code=status.HTTP_204_NO_CONTENT)
def trocar_senha(
    dados: TrocarSenhaRequest,
    usuario: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not verificar_senha(dados.senha_atual, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha atual incorreta")

    usuario.senha_hash = hash_senha(dados.nova_senha)
    session.add(usuario)
    session.commit()

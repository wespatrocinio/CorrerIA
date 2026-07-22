from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from .database import get_session
from .models import Corredor, Usuario
from .security import decodificar_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> Usuario:
    usuario_id = decodificar_token(credentials.credentials)
    if not usuario_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return usuario


def get_corredor_atual(
    usuario: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Corredor:
    corredor = session.exec(select(Corredor).where(Corredor.usuario_id == usuario.id)).first()
    if not corredor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Corredor ainda não configurado — chame PUT /api/corredor primeiro",
        )
    return corredor

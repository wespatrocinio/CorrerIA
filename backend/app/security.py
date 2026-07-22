import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

# Em produção, defina CORRERIA_SECRET_KEY no ambiente — este default só serve para dev local.
SECRET_KEY = os.environ.get("CORRERIA_SECRET_KEY", "dev-secret-troque-em-producao")
ALGORITHM = "HS256"
EXPIRA_EM_MINUTOS = 60 * 24 * 7  # 7 dias


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))


def criar_token(usuario_id: str) -> str:
    expira = datetime.utcnow() + timedelta(minutes=EXPIRA_EM_MINUTOS)
    payload = {"sub": usuario_id, "exp": expira}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

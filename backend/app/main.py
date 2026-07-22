import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import criar_tabelas
from .routers import auth, ciclos, corredor, semanas, treinos


@asynccontextmanager
async def lifespan(app: FastAPI):
    criar_tabelas()
    yield


app = FastAPI(title="CorrerIA API", lifespan=lifespan)

# CORRERIA_CORS_ORIGINS: lista separada por vírgula (ex: "https://correria.up.railway.app").
# Sem a variável definida, cai no default de desenvolvimento local (Vite).
_cors_origins_env = os.environ.get("CORRERIA_CORS_ORIGINS")
CORS_ORIGINS = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else ["http://localhost:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(corredor.router, prefix="/api/corredor", tags=["corredor"])
app.include_router(ciclos.router, prefix="/api/ciclos", tags=["ciclos"])
app.include_router(semanas.router, prefix="/api/semanas", tags=["semanas"])
app.include_router(treinos.router, prefix="/api", tags=["treinos"])


@app.get("/api/health")
def health():
    return {"status": "ok"}

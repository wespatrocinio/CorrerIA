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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

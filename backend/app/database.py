import os

from sqlmodel import Session, SQLModel, create_engine

# Em produção (Railway), aponte CORRERIA_DB_PATH para um volume persistente
# (ex: /data/correria.db) — sem isso, o SQLite é perdido a cada novo deploy.
DB_PATH = os.environ.get(
    "CORRERIA_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "correria.db"),
)
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def criar_tabelas():
    from . import models  # noqa: F401 — garante que as tabelas estão registradas no metadata

    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

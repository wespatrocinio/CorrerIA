import os

from sqlalchemy import inspect, text
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
    _adicionar_colunas_faltantes()


def _adicionar_colunas_faltantes():
    """`create_all` só cria tabelas novas — não altera tabelas já existentes.
    Como o schema ainda muda com frequência (sem Alembic por enquanto), aqui
    comparamos as colunas declaradas nos modelos com as colunas reais de cada
    tabela e adicionamos as que faltarem via ALTER TABLE, sem perder dados."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in SQLModel.metadata.sorted_tables:
            colunas_existentes = {col["name"] for col in inspector.get_columns(table.name)}
            for coluna in table.columns:
                if coluna.name not in colunas_existentes:
                    tipo_sql = coluna.type.compile(dialect=engine.dialect)
                    conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{coluna.name}" {tipo_sql}'))


def get_session():
    with Session(engine) as session:
        yield session

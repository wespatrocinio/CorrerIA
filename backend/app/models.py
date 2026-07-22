"""Tabelas SQLModel — porte 1:1 do modelo já validado em CorrerIA/js/models.js.

Arrays planos com FKs (sem Relationship() do SQLModel) de propósito: mantém o mesmo
estilo de "joins explícitos" usado no protótipo, mais simples de acompanhar que
relacionamentos ORM aninhados para um schema deste tamanho.
"""
import uuid
from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Usuario(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    email: str = Field(unique=True, index=True)
    senha_hash: str
    criado_em: datetime = Field(default_factory=datetime.utcnow)


class Corredor(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    usuario_id: str = Field(foreign_key="usuario.id", unique=True, index=True)
    faixa_aquecimento_desaquecimento: str
    faixa_leve: str
    faixa_moderado: str
    faixa_forte: str
    faixa_muito_forte: str
    # Dados pessoais — opcionais, preenchidos na tela de conta (não fazem parte do onboarding).
    nome: Optional[str] = None
    sobrenome: Optional[str] = None
    data_nascimento: Optional[date] = None
    altura_cm: Optional[float] = None
    peso_kg: Optional[float] = None
    genero: Optional[str] = None


class Objetivo(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    corredor_id: str = Field(foreign_key="corredor.id", index=True)
    tipo: str
    meta: Optional[str] = None
    data_alvo: Optional[date] = None


class Ciclo(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    objetivo_id: str = Field(foreign_key="objetivo.id", index=True)
    data_inicio: date
    duracao_semanas: int
    fase: Optional[str] = None  # reservado — periodização automática não faz parte do V1
    meta_volume_semanal_km: Optional[float] = None
    criado_em: datetime = Field(default_factory=datetime.utcnow)


class Semana(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    ciclo_id: str = Field(foreign_key="ciclo.id", index=True)
    numero: int


class Dia(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    semana_id: str = Field(foreign_key="semana.id", index=True)
    data: date


class Treino(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    dia_id: str = Field(foreign_key="dia.id", unique=True, index=True)
    tipo: str
    template_estrutural: str
    contexto: str
    status: str = "planejado"
    realizacao_categoria: Optional[str] = None
    km_realizado: Optional[float] = None
    link_registro: Optional[str] = None
    observacoes: Optional[str] = None


class Bloco(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    treino_id: str = Field(foreign_key="treino.id", index=True)
    # sub-blocos de repetição (tiro/recuperação) apontam pro bloco tipo "repeticao" via parent_bloco_id
    parent_bloco_id: Optional[str] = Field(default=None, foreign_key="bloco.id", index=True)
    ordem: int
    tipo: str  # aquecimento | principal | recuperacao | desaquecimento | repeticao
    nome: Optional[str] = None  # só editável em template customizado
    duracao_valor: float
    duracao_unidade: str  # km | min
    intensidade: Optional[str] = None
    intensidade_congelada: Optional[str] = None
    repeticoes: Optional[int] = None  # só preenchido se tipo == repeticao

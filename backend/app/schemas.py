from datetime import date
from typing import List, Optional

from pydantic import BaseModel


# --- Auth ---

class RegistroRequest(BaseModel):
    email: str
    senha: str


class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TrocarSenhaRequest(BaseModel):
    senha_atual: str
    nova_senha: str


# --- Corredor ---

class CorredorRequest(BaseModel):
    faixa_aquecimento_desaquecimento: str
    faixa_leve: str
    faixa_moderado: str
    faixa_forte: str
    faixa_muito_forte: str


class CorredorResponse(CorredorRequest):
    id: str
    nome: Optional[str] = None
    sobrenome: Optional[str] = None
    data_nascimento: Optional[date] = None
    altura_cm: Optional[float] = None
    peso_kg: Optional[float] = None
    genero: Optional[str] = None


class PerfilPessoalRequest(BaseModel):
    nome: Optional[str] = None
    sobrenome: Optional[str] = None
    data_nascimento: Optional[date] = None
    altura_cm: Optional[float] = None
    peso_kg: Optional[float] = None
    genero: Optional[str] = None


# --- Objetivo / Ciclo ---

class ObjetivoInput(BaseModel):
    tipo: str
    meta: Optional[str] = None
    data_alvo: Optional[date] = None


class ObjetivoOutput(ObjetivoInput):
    id: str


class CicloCreateRequest(BaseModel):
    objetivo: ObjetivoInput
    data_inicio: date
    duracao_semanas: int


class CicloUpdateRequest(BaseModel):
    objetivo: ObjetivoInput
    data_inicio: date
    meta_volume_semanal_km: Optional[float] = None


class CicloResponse(BaseModel):
    id: str
    objetivo: ObjetivoOutput
    data_inicio: date
    duracao_semanas: int
    meta_volume_semanal_km: Optional[float] = None


class SemanaResumo(BaseModel):
    id: str
    numero: int
    data_inicio: date
    data_fim: date
    status: str  # passada | atual | futura_planejada | futura_vazia
    volume_planejado_km: float
    volume_planejado_min: float
    volume_realizado_km: float
    n_treinos: int


class DuplicarSemanaRequest(BaseModel):
    semana_origem_id: str


# --- Bloco ---

class BlocoInput(BaseModel):
    id: Optional[str] = None  # ausente = bloco novo, gerado no servidor
    ordem: int
    tipo: str
    nome: Optional[str] = None
    duracao_valor: float
    duracao_unidade: str
    intensidade: Optional[str] = None
    repeticoes: Optional[int] = None
    sub_blocos: List["BlocoInput"] = []


BlocoInput.model_rebuild()


class BlocoOutput(BaseModel):
    id: str
    ordem: int
    tipo: str
    nome: Optional[str] = None
    duracao_valor: float
    duracao_unidade: str
    intensidade: Optional[str] = None
    intensidade_congelada: Optional[str] = None
    repeticoes: Optional[int] = None
    sub_blocos: List["BlocoOutput"] = []


BlocoOutput.model_rebuild()


# --- Treino ---

class TreinoCreateRequest(BaseModel):
    tipo: str


class TreinoUpdateRequest(BaseModel):
    tipo: str
    template_estrutural: str
    contexto: str
    status: str = "planejado"
    realizacao_categoria: Optional[str] = None
    km_realizado: Optional[float] = None
    link_registro: Optional[str] = None
    observacoes: Optional[str] = None
    blocos: List[BlocoInput] = []


class TreinoOutput(BaseModel):
    id: str
    tipo: str
    template_estrutural: str
    contexto: str
    status: str
    realizacao_categoria: Optional[str] = None
    km_realizado: Optional[float] = None
    link_registro: Optional[str] = None
    observacoes: Optional[str] = None
    total_km: float
    total_min: float
    blocos: List[BlocoOutput] = []


class DiaOutput(BaseModel):
    id: str
    data: date
    treino: Optional[TreinoOutput] = None


class SemanaDetalhe(BaseModel):
    id: str
    numero: int
    dias: List[DiaOutput]
    volume_planejado_km: float
    volume_planejado_min: float
    volume_realizado_km: float

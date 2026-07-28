from datetime import date, datetime
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
    faixa_caminhada_recuperacao: str


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
    meta_volume_semanal_km: Optional[float] = None


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


# --- Ponto / Trecho / Rota ---

class PontoInput(BaseModel):
    nome: str


class PontoOutput(PontoInput):
    id: str


class TrechoInput(BaseModel):
    nome: Optional[str] = None
    ponto_partida_id: str
    ponto_chegada_id: str
    distancia_km: float


class TrechoOutput(TrechoInput):
    id: str
    ponto_partida: PontoOutput
    ponto_chegada: PontoOutput


class RotaTrechoInput(BaseModel):
    trecho_id: str
    invertido: bool = False


class RotaTrechoOutput(BaseModel):
    trecho: TrechoOutput
    ordem: int
    invertido: bool


class RotaCreateRequest(BaseModel):
    nome: str
    trechos: List[RotaTrechoInput] = []


class RotaOutput(BaseModel):
    id: str
    nome: str
    trechos: List[RotaTrechoOutput] = []
    distancia_total_km: float


class RotaResumo(BaseModel):
    id: str
    nome: str
    distancia_total_km: float


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
    rota_id: Optional[str] = None


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
    rota_id: Optional[str] = None
    rota: Optional[RotaResumo] = None


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


# --- Garmin ---

class GarminUrlRequest(BaseModel):
    url: str


class GarminSplitOutput(BaseModel):
    tipo: str
    distancia_km: float
    fc_media: Optional[float] = None
    cadencia_media: Optional[float] = None
    passada_cm: Optional[float] = None
    elevacao_ganho_m: Optional[float] = None


class GarminZonaFcOutput(BaseModel):
    zona: int
    limite_inferior_bpm: int
    minutos: float


class GarminAlertaOutput(BaseModel):
    severidade: str  # baixa | media | alta
    tipo: str
    fato: str


class ExecucaoGarminOutput(BaseModel):
    id: str
    treino_id: str
    url: str
    nome_atividade: Optional[str] = None
    tipo_atividade: Optional[str] = None
    distancia_km: Optional[float] = None
    duracao_min: Optional[float] = None
    ritmo_medio_min_km: Optional[float] = None
    fc_media: Optional[float] = None
    fc_maxima: Optional[float] = None
    cadencia_media: Optional[float] = None
    cadencia_maxima: Optional[float] = None
    passada_cm: Optional[float] = None
    elevacao_ganho_m: Optional[float] = None
    elevacao_perda_m: Optional[float] = None
    splits: List[GarminSplitOutput] = []
    zonas_fc: List[GarminZonaFcOutput] = []
    criado_em: datetime
    analise_texto: Optional[str] = None
    alertas: List[GarminAlertaOutput] = []
    analisado_em: Optional[datetime] = None

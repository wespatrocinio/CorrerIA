"""Regras puras de composição de rotas — separado dos routers pra ficar fácil de testar
sem precisar da sessão do banco."""
from typing import List, Tuple

from .models import Trecho


def ponto_efetivo(trecho: Trecho, invertido: bool) -> Tuple[str, str]:
    """(ponto_partida_efetivo_id, ponto_chegada_efetivo_id), considerando a inversão de sentido."""
    if invertido:
        return trecho.ponto_chegada_id, trecho.ponto_partida_id
    return trecho.ponto_partida_id, trecho.ponto_chegada_id


def validar_cadeia(trechos_ordenados: List[Tuple[Trecho, bool]]) -> None:
    """Levanta ValueError se a chegada efetiva de um trecho não bate com a partida
    efetiva do próximo. Lista vazia ou de um único trecho é sempre válida."""
    for i in range(len(trechos_ordenados) - 1):
        trecho_atual, invertido_atual = trechos_ordenados[i]
        trecho_prox, invertido_prox = trechos_ordenados[i + 1]
        _, chegada_atual = ponto_efetivo(trecho_atual, invertido_atual)
        partida_prox, _ = ponto_efetivo(trecho_prox, invertido_prox)
        if chegada_atual != partida_prox:
            raise ValueError(f"O trecho na posição {i + 2} não começa onde o trecho anterior termina.")


def distancia_total(trechos: List[Trecho]) -> float:
    return round(sum(t.distancia_km for t in trechos), 2)

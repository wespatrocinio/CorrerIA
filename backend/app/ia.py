"""Análise de IA: compara treino planejado vs. dados do Garmin e gera alertas
de divergência.

Regras de gatilho e severidade são determinísticas (função `gerar_alertas`,
sem IA) — o modelo só redige a narrativa em cima dos números que calculamos
aqui, para não "alucinar" risco.
"""
import json
import os
from typing import Dict, List, Optional

import anthropic

from .logic import faixa_do_corredor, total_treino
from .models import Bloco, Corredor, ExecucaoGarmin, Treino

_MODEL = os.environ.get("CORRERIA_IA_MODEL", "claude-opus-4-8")


def _nivel_dominante(blocos: List[Bloco]) -> Optional[str]:
    """Nível de intensidade mais frequente entre os blocos principais (ignora aquecimento/desaquecimento)."""
    candidatos = [b.intensidade for b in blocos if b.tipo == "principal" and b.intensidade]
    if not candidatos:
        candidatos = [b.intensidade for b in blocos if b.intensidade]
    if not candidatos:
        return None
    return max(set(candidatos), key=candidatos.count)


def gerar_alertas(corredor: Corredor, blocos: List[Bloco], execucao: ExecucaoGarmin) -> List[Dict]:
    """Regras determinísticas — decidem SE e COM QUE SEVERIDADE alertar."""
    alertas: List[Dict] = []
    km_planejado, _min_planejado = total_treino(corredor, blocos)

    if km_planejado > 0 and execucao.distancia_km is not None:
        delta_pct = (execucao.distancia_km - km_planejado) / km_planejado
        if abs(delta_pct) >= 0.25:
            alertas.append({
                "severidade": "alta" if abs(delta_pct) >= 0.5 else "media",
                "tipo": "volume",
                "fato": (
                    f"Distância planejada: {km_planejado:.1f} km. Realizada: {execucao.distancia_km:.1f} km "
                    f"({'+' if delta_pct > 0 else ''}{delta_pct * 100:.0f}%)."
                ),
            })

    nivel = _nivel_dominante(blocos)
    pace_alvo = faixa_do_corredor(corredor, nivel) if nivel else None
    if pace_alvo and execucao.ritmo_medio_min_km is not None:
        m, s = pace_alvo.split(":")
        pace_alvo_min = int(m) + int(s) / 60
        delta_pace = execucao.ritmo_medio_min_km - pace_alvo_min  # negativo = mais rápido que o previsto
        if delta_pace <= -0.5:
            alertas.append({
                "severidade": "alta" if delta_pace <= -1.0 else "media",
                "tipo": "intensidade",
                "fato": (
                    f"Treino planejado como '{nivel}' (~{pace_alvo}/km), mas executado a "
                    f"{execucao.ritmo_medio_min_km:.2f} min/km — mais forte que o previsto."
                ),
            })

    if nivel in ("aquecimento_desaquecimento", "leve") and execucao.zonas_fc_json:
        zonas = json.loads(execucao.zonas_fc_json)
        total_seg = sum(z["secsInZone"] for z in zonas)
        seg_alta = sum(z["secsInZone"] for z in zonas if z["zoneNumber"] >= 4)
        if total_seg > 0 and seg_alta / total_seg >= 0.3:
            alertas.append({
                "severidade": "alta",
                "tipo": "esforco_cardiaco",
                "fato": (
                    f"Treino planejado como leve/recuperação, mas {seg_alta / total_seg * 100:.0f}% do tempo "
                    f"ficou em zonas altas de FC (4-5)."
                ),
            })

    return alertas


def _montar_prompt(corredor: Corredor, treino: Treino, blocos: List[Bloco], execucao: ExecucaoGarmin,
                    alertas: List[Dict]) -> str:
    km_planejado, min_planejado = total_treino(corredor, blocos)
    splits = json.loads(execucao.splits_json) if execucao.splits_json else []
    zonas = json.loads(execucao.zonas_fc_json) if execucao.zonas_fc_json else []

    fatos = {
        "tipo_treino": treino.tipo,
        "planejado": {"km": round(km_planejado, 2), "min": round(min_planejado, 1)},
        "realizado": {
            "km": execucao.distancia_km,
            "min": execucao.duracao_min,
            "ritmo_min_km": execucao.ritmo_medio_min_km,
            "fc_media": execucao.fc_media,
            "fc_maxima": execucao.fc_maxima,
            "cadencia_media": execucao.cadencia_media,
            "passada_cm": execucao.passada_cm,
            "elevacao_ganho_m": execucao.elevacao_ganho_m,
        },
        "splits": splits,
        "zonas_fc_segundos": zonas,
        "alertas_detectados": alertas,
    }

    return (
        "Você é um assistente de análise de corrida. Receba os dados de um treino planejado "
        "e o que foi de fato executado (via Garmin Connect) em JSON. Responda em português, "
        "em texto corrido (sem markdown, sem listas), com no máximo 3 parágrafos curtos:\n\n"
        "1. Compare objetivamente o que foi planejado vs. o que foi realizado (distância, duração, ritmo).\n"
        "2. Analise os parâmetros da corrida (ritmo, frequência cardíaca, cadência, passada, elevação) — "
        "aponte o que chama atenção, sem fazer prescrição nem recomendar mudanças de treino.\n"
        "3. Se houver itens em 'alertas_detectados', explique o risco de cada um em linguagem simples "
        "(ex: risco de lesão por esforço excessivo, fadiga acumulada) — se a lista estiver vazia, diga "
        "que não há divergências significativas.\n\n"
        "Não invente números que não estão nos dados. Não dê conselhos de treino ou prescrições.\n\n"
        f"DADOS:\n{json.dumps(fatos, ensure_ascii=False, indent=2)}"
    )


def gerar_analise(corredor: Corredor, treino: Treino, blocos: List[Bloco], execucao: ExecucaoGarmin) -> Dict:
    alertas = gerar_alertas(corredor, blocos, execucao)
    prompt = _montar_prompt(corredor, treino, blocos, execucao, alertas)

    client = anthropic.Anthropic()  # usa ANTHROPIC_API_KEY do ambiente
    resposta = client.messages.create(
        model=_MODEL,
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    texto = next((b.text for b in resposta.content if b.type == "text"), "")

    return {"analise_texto": texto, "alertas": alertas}

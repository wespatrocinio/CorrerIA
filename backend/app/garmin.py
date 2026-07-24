"""Integração com Garmin Connect via URL pública de atividade.

Sem login/credenciais: a atividade precisa estar marcada como "Todos" (pública)
no Garmin Connect. Um Chromium headless carrega a página e escutamos as
respostas de rede dos endpoints internos (gc-api/activity-service/...) que
alimentam os gráficos — os mesmos que um GET direto (sem navegador) não
consegue autenticar (o Garmin exige um desafio JS que só um browser resolve).

Validado manualmente em PoC antes de virar código de produto (ver conversa).
"""
import json
import re
from typing import Optional

from playwright.sync_api import sync_playwright

from .models import ExecucaoGarmin

_ENDPOINTS_DE_INTERESSE = {
    re.compile(r"/gc-api/activity-service/activity/\d+$"): "resumo",
    re.compile(r"/gc-api/activity-service/activity/\d+/hrTimeInZones$"): "zonas_fc",
    re.compile(r"/gc-api/activity-service/activity/\d+/weather"): "clima",
}

_TIMEOUT_NAVEGACAO_MS = 20000
_TIMEOUT_ESPERA_RESUMO_MS = 10000


class ErroGarmin(Exception):
    """Falha ao extrair dados de uma atividade do Garmin Connect."""


def extrair_activity_id(url: str) -> str:
    match = re.search(r"/activity/(\d+)", url)
    if not match:
        raise ErroGarmin("URL não parece ser de uma atividade do Garmin Connect (esperado .../activity/<id>).")
    return match.group(1)


def buscar_atividade(url: str) -> dict:
    """Abre a URL num Chromium headless e devolve os JSONs capturados
    (chaves: resumo, zonas_fc, clima). Lança ErroGarmin se a atividade não
    for acessível publicamente ou não vier o resumo dentro do timeout."""
    extrair_activity_id(url)  # valida o formato antes de gastar tempo abrindo browser

    resultado: dict = {}

    with sync_playwright() as p:
        # --no-sandbox e --disable-dev-shm-usage: sem eles o Chromium tende a
        # falhar em containers (sandbox restrito / partição /dev/shm pequena),
        # caso comum em ambientes como o da Railway.
        navegador = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            pagina = navegador.new_page()

            def ao_receber_resposta(response):
                if response.status != 200:
                    return
                for padrao, chave in _ENDPOINTS_DE_INTERESSE.items():
                    if padrao.search(response.url):
                        try:
                            resultado[chave] = response.json()
                        except Exception:
                            pass
                        break

            pagina.on("response", ao_receber_resposta)

            try:
                pagina.goto(url, wait_until="load", timeout=_TIMEOUT_NAVEGACAO_MS)
            except Exception as e:
                raise ErroGarmin(f"Não consegui carregar a página do Garmin Connect: {e}") from e

            esperado_ate = _TIMEOUT_ESPERA_RESUMO_MS
            intervalo = 500
            while "resumo" not in resultado and esperado_ate > 0:
                pagina.wait_for_timeout(intervalo)
                esperado_ate -= intervalo

            pagina.wait_for_timeout(1500)  # folga pra zonas_fc/clima, que chegam logo depois do resumo
        finally:
            navegador.close()

    if "resumo" not in resultado:
        raise ErroGarmin(
            "Não recebi os dados da atividade — verifique se o link é público "
            "(Garmin Connect > atividade > Editar > Visibilidade > Todos)."
        )

    return resultado


def montar_execucao(treino_id: str, url: str, dados: dict) -> ExecucaoGarmin:
    """Converte o JSON bruto do Garmin no registro que persistimos."""
    resumo = dados["resumo"]
    s = resumo.get("summaryDTO", {}) or {}

    velocidade = s.get("averageSpeed")
    ritmo_min_km: Optional[float] = (1000 / velocidade / 60) if velocidade else None

    return ExecucaoGarmin(
        treino_id=treino_id,
        url=url,
        activity_id=str(resumo.get("activityId", "")),
        nome_atividade=resumo.get("activityName"),
        tipo_atividade=(resumo.get("activityTypeDTO") or {}).get("typeKey"),
        distancia_km=(s.get("distance") or 0) / 1000 or None,
        duracao_min=(s.get("duration") or 0) / 60 or None,
        ritmo_medio_min_km=ritmo_min_km,
        fc_media=s.get("averageHR"),
        fc_maxima=s.get("maxHR"),
        cadencia_media=s.get("averageRunCadence"),
        cadencia_maxima=s.get("maxRunCadence"),
        passada_cm=s.get("strideLength"),
        elevacao_ganho_m=s.get("elevationGain"),
        elevacao_perda_m=s.get("elevationLoss"),
        splits_json=json.dumps(resumo.get("splitSummaries", [])),
        zonas_fc_json=json.dumps(dados["zonas_fc"]) if "zonas_fc" in dados else None,
        clima_json=json.dumps(dados["clima"]) if "clima" in dados else None,
    )

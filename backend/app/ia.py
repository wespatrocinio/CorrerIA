"""Análise de IA: compara treino planejado vs. dados do Garmin e gera alertas
de divergência.

Regras de gatilho e severidade são determinísticas (função `gerar_alertas`,
sem IA) — o modelo só redige a narrativa em cima dos números que calculamos
aqui, para não "alucinar" risco.
"""
import json
import os
from datetime import date
from typing import Dict, List, Optional

from google import genai

from .logic import faixa_do_corredor, total_treino
from .models import Bloco, Corredor, ExecucaoGarmin, Treino

_MODEL = os.environ.get("CORRERIA_IA_MODEL", "gemini-3.5-flash-lite")

# Tipos de split que representam corrida de fato (exclui aquecimento/descanso/caminhada) —
# usados pra derivar progressão de ritmo/FC sem incluir trechos que distorceriam a comparação.
_TIPOS_CORRIDA = {"RWD_RUN", "INTERVAL_ACTIVE"}


def _calcular_idade(data_nascimento: Optional[date]) -> Optional[int]:
    if not data_nascimento:
        return None
    hoje = date.today()
    idade = hoje.year - data_nascimento.year
    aniversario_ainda_nao_ocorreu = (hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day)
    if aniversario_ainda_nao_ocorreu:
        idade -= 1
    return idade


def _pace_decimal(pace_str: str) -> float:
    m, s = pace_str.split(":")
    return int(m) + int(s) / 60


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


def _progressao_splits(splits: List[Dict]) -> Optional[Dict]:
    """Deriva sinais de progressão (ritmo e FC ao longo do treino) a partir dos splits.

    Calculado aqui, não pela IA — modelos de linguagem não são confiáveis fazendo
    aritmética/comparação sobre arrays, então entregamos os deltas já prontos.
    """
    corridos = [
        sp for sp in splits
        if sp.get("splitType") in _TIPOS_CORRIDA and sp.get("averageSpeed") and sp.get("distance")
    ]
    if len(corridos) < 2:
        return None

    paces = [round(1000 / sp["averageSpeed"] / 60, 2) for sp in corridos]
    progressao: Dict = {
        "ritmo_primeiro_trecho_min_km": paces[0],
        "ritmo_ultimo_trecho_min_km": paces[-1],
        "ritmo_por_trecho_min_km": paces,
    }

    fcs = [sp["averageHR"] for sp in corridos if sp.get("averageHR")]
    metade = len(fcs) // 2
    if len(fcs) >= 2 and metade > 0:
        progressao["fc_media_primeira_metade_bpm"] = round(sum(fcs[:metade]) / metade, 1)
        progressao["fc_media_segunda_metade_bpm"] = round(sum(fcs[metade:]) / (len(fcs) - metade), 1)
        progressao["fc_por_trecho_bpm"] = fcs

    cadencias = [sp["averageRunCadence"] for sp in corridos if sp.get("averageRunCadence")]
    if len(cadencias) >= 2:
        progressao["cadencia_por_trecho_ppm"] = [round(c, 0) for c in cadencias]
        progressao["cadencia_variacao_ppm"] = round(max(cadencias) - min(cadencias), 0)

    ganhos_elevacao = [sp.get("elevationGain") for sp in corridos if sp.get("elevationGain") is not None]
    if any(g and g > 0 for g in ganhos_elevacao):
        progressao["elevacao_ganho_por_trecho_m"] = [round(g or 0, 0) for g in ganhos_elevacao]

    return progressao


_INSTRUCOES = """Você é um analista de fisiologia do exercício e biomecânica especializado em corrida de rua. Sua função é analisar relatórios de treinos de corrida extraídos de dispositivos Garmin e compará-los com o planejamento de treino do usuário.

Sua resposta será exibida na interface de um aplicativo de corrida. Portanto, ela deve ser sucinta, objetiva, transparente, empática e motivadora, focando nos fatos fisiológicos e biomecânicos sem adotar um tom laudatório vazio.

---

### ENTRADA DE DADOS
Os dados abaixo (chave DADOS) trazem:
1. Dados do Treino Planejado (pace alvo, distância, tipo de treino).
2. Dados do Treino Realizado (distância real, pace médio/por km, frequência cardíaca média e máxima, série por trecho de FC/cadência/elevação, cadência média e variação, ganho/perda de elevação).
3. Perfil do Atleta, quando disponível (peso, altura, idade, FC máxima estimada por 220-idade — nunca medida em laboratório).
4. `alertas_detectados`: riscos já calculados deterministicamente (não pela IA) a partir dos números acima — trate-os como fatos verificados, não como sugestões a inventar.

---

### DIRETRIZES DE ANÁLISE

Analise a sessão de treino sob os 4 pilares a seguir, articulando as variáveis de forma integrada (ex: impacto do relevo na cadência e na FC). Só analise um pilar se os dados necessários estiverem presentes — não invente números.

1. Planejado vs. Realizado:
   - Quantifique a aderência ao volume e à intensidade prescrita.
   - Aponte riscos fisiológicos do desvio:
     * Se EXCEDEU a intensidade/volume: risco de fadiga residual, acidose precoce, aumento do tempo de recuperação, overreaching ou lesão tecidual.
     * Se FICOU AQUÉM da intensidade/volume: risco de subestimular a via metabólica desejada (ex: não atingir o limiar de lactato ou potência aeróbica máxima).

2. Comportamento Cardiovascular (FC & Drift Cardíaco):
   - Verifique se a faixa de BPM se manteve coerente com a zona energética alvo.
   - Avalie desvios para batimentos excessivamente elevados (ex: >90-95% da FC máxima estimada, se o perfil do atleta permitir esse cálculo) e os riscos associados.
   - Detecte a presença de Desvio Cardíaco (Cardiac Drift): aumento progressivo da FC ao longo do tempo (compare 'fc_por_trecho_bpm' ou 'fc_media_primeira_metade_bpm' vs. 'fc_media_segunda_metade_bpm') mantendo o mesmo pace ou velocidade, correlacionando-o com possível desidratação, estresse térmico ou fadiga mecânica.

3. Cadência e Biomecânica de Passada:
   - Avalie a cadência média (ppm) em relação ao tipo de treino e à velocidade executada, usando 'cadencia_por_trecho_ppm' e 'cadencia_variacao_ppm' quando presentes.
   - Correlacione a cadência com o esforço cardiovascular: cadências excessivamente baixas para o pace indicam oscilação vertical alta, maior tempo de contato com o solo e sobrecarga articular; cadências muito altas sem eficiência podem aumentar o custo metabólico.

4. Impacto da Altimetria (Elevação):
   - Analise como subidas e descidas impactaram diretamente a oscilação da FC, da cadência e da perda/ganho de ritmo, usando 'elevacao_ganho_por_trecho_m' junto com 'ritmo_por_trecho_min_km' e 'fc_por_trecho_bpm' quando presentes.
   - Identifique se o atleta manteve o controle de esforço nos aclives ou se "estourou" a zona de frequência cardíaca ao tentar sustentar o pace na subida.

---

### REGRAS DE SAÍDA (FORMATO DA RESPOSTA)

Responda em português. Sua resposta DEVE ser estritamente estruturada conforme o modelo abaixo, mantendo um tom claro, honesto e encorajador. Use texto simples (sem markdown — sem **, #, ou tabelas): cada seção começa com o título numerado em uma linha própria, e itens de lista começam com um traço "-" em linha própria.

1. Resumo da Aderência (Highlight / Lowlight Principal)
   - Uma frase curta indicando o principal acerto e o principal desvio do treino.

2. Destaques Positivos (Highlights)
   - Bullet points curtos apontando os pontos fortes da execução física/fisiológica.

3. Pontos de Atenção e Riscos (Lowlights & Risks)
   - Bullet points curtos detalhando riscos biomecânicos ou fisiológicos observados na discrepância entre o planejado e o executado, comportamento do BPM, cadência ou impacto da altimetria.

4. Oportunidades de Melhoria (Sem Prescrever Treinos)
   - Pontos focados em consciência corporal, estratégias de ritmo, hidratação ou sinalização de tópicos para o usuário consultar/avaliar com seu treinador, médico ou fisioterapeuta.

---

### RESTRIÇÕES IMPORTANTES
- NÃO prescreva novos treinos, alterações na planilha ou dietas/suplementações.
- NÃO utilize elogios genéricos ou vazios (ex: "Você foi incrível!"). Seja empático, porém focado em dados reais.
- Mantenha o texto sucinto e adaptado para leitura rápida em telas de smartphones."""


def _montar_prompt(corredor: Corredor, treino: Treino, blocos: List[Bloco], execucao: ExecucaoGarmin,
                    alertas: List[Dict]) -> str:
    km_planejado, min_planejado = total_treino(corredor, blocos)
    splits = json.loads(execucao.splits_json) if execucao.splits_json else []
    zonas = json.loads(execucao.zonas_fc_json) if execucao.zonas_fc_json else []

    nivel = _nivel_dominante(blocos)
    pace_alvo = faixa_do_corredor(corredor, nivel) if nivel else None

    idade = _calcular_idade(corredor.data_nascimento)

    fatos = {
        "tipo_treino": treino.tipo,
        "planejado": {
            "km": round(km_planejado, 2),
            "min": round(min_planejado, 1),
            "nivel_intensidade_dominante": nivel,
            "ritmo_alvo_min_km": pace_alvo,
        },
        "realizado": {
            "km": execucao.distancia_km,
            "min": execucao.duracao_min,
            "ritmo_min_km": execucao.ritmo_medio_min_km,
            "fc_media": execucao.fc_media,
            "fc_maxima": execucao.fc_maxima,
            "cadencia_media": execucao.cadencia_media,
            "cadencia_maxima": execucao.cadencia_maxima,
            "passada_cm": execucao.passada_cm,
            "elevacao_ganho_m": execucao.elevacao_ganho_m,
            "elevacao_perda_m": execucao.elevacao_perda_m,
        },
        "perfil_atleta": {
            "peso_kg": corredor.peso_kg,
            "altura_cm": corredor.altura_cm,
            "idade": idade,
            "genero": corredor.genero,
            "fc_maxima_estimada_220_menos_idade": (220 - idade) if idade else None,
        },
        "splits": splits,
        "progressao": _progressao_splits(splits),
        "zonas_fc_segundos": zonas,
        "alertas_detectados": alertas,
    }

    return f"{_INSTRUCOES}\n\nDADOS:\n{json.dumps(fatos, ensure_ascii=False, indent=2)}"


def gerar_analise(corredor: Corredor, treino: Treino, blocos: List[Bloco], execucao: ExecucaoGarmin) -> Dict:
    alertas = gerar_alertas(corredor, blocos, execucao)
    prompt = _montar_prompt(corredor, treino, blocos, execucao, alertas)

    client = genai.Client()  # usa GEMINI_API_KEY (ou GOOGLE_API_KEY) do ambiente
    resposta = client.models.generate_content(model=_MODEL, contents=prompt)

    return {"analise_texto": resposta.text, "alertas": alertas}

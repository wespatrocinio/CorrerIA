import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_corredor_atual
from ..garmin import ErroGarmin, buscar_atividade, montar_execucao
from ..ia import gerar_analise
from ..models import Bloco, Corredor, ExecucaoGarmin
from ..schemas import (
    ExecucaoGarminOutput,
    GarminAlertaOutput,
    GarminSplitOutput,
    GarminUrlRequest,
    GarminZonaFcOutput,
)
from .treinos import _validar_treino_do_corredor

router = APIRouter()


def _execucao_output(execucao: ExecucaoGarmin) -> ExecucaoGarminOutput:
    splits_raw = json.loads(execucao.splits_json) if execucao.splits_json else []
    zonas_raw = json.loads(execucao.zonas_fc_json) if execucao.zonas_fc_json else []
    alertas_raw = json.loads(execucao.alertas_json) if execucao.alertas_json else []
    return ExecucaoGarminOutput(
        id=execucao.id,
        treino_id=execucao.treino_id,
        url=execucao.url,
        nome_atividade=execucao.nome_atividade,
        tipo_atividade=execucao.tipo_atividade,
        distancia_km=execucao.distancia_km,
        duracao_min=execucao.duracao_min,
        ritmo_medio_min_km=execucao.ritmo_medio_min_km,
        fc_media=execucao.fc_media,
        fc_maxima=execucao.fc_maxima,
        cadencia_media=execucao.cadencia_media,
        cadencia_maxima=execucao.cadencia_maxima,
        passada_cm=execucao.passada_cm,
        elevacao_ganho_m=execucao.elevacao_ganho_m,
        elevacao_perda_m=execucao.elevacao_perda_m,
        splits=[
            GarminSplitOutput(
                tipo=sp.get("splitType", ""),
                distancia_km=(sp.get("distance") or 0) / 1000,
                fc_media=sp.get("averageHR"),
                cadencia_media=sp.get("averageRunCadence"),
                passada_cm=sp.get("strideLength"),
                elevacao_ganho_m=sp.get("elevationGain"),
            )
            for sp in splits_raw
        ],
        zonas_fc=[
            GarminZonaFcOutput(
                zona=z["zoneNumber"], limite_inferior_bpm=z["zoneLowBoundary"], minutos=z["secsInZone"] / 60
            )
            for z in zonas_raw
        ],
        criado_em=execucao.criado_em,
        analise_texto=execucao.analise_texto,
        alertas=[GarminAlertaOutput(**a) for a in alertas_raw],
        analisado_em=execucao.analisado_em,
    )


@router.post("/treinos/{treino_id}/garmin", response_model=ExecucaoGarminOutput, status_code=status.HTTP_201_CREATED)
def sincronizar_garmin(
    treino_id: str,
    dados: GarminUrlRequest,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    treino = _validar_treino_do_corredor(session, corredor, treino_id)

    try:
        bruto = buscar_atividade(dados.url)
    except ErroGarmin as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    existente = session.exec(select(ExecucaoGarmin).where(ExecucaoGarmin.treino_id == treino.id)).first()
    if existente:
        session.delete(existente)
        session.flush()

    execucao = montar_execucao(treino.id, dados.url, bruto)
    session.add(execucao)
    session.commit()
    session.refresh(execucao)
    return _execucao_output(execucao)


@router.get("/treinos/{treino_id}/garmin", response_model=Optional[ExecucaoGarminOutput])
def obter_garmin(
    treino_id: str,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    treino = _validar_treino_do_corredor(session, corredor, treino_id)
    execucao = session.exec(select(ExecucaoGarmin).where(ExecucaoGarmin.treino_id == treino.id)).first()
    if not execucao:
        return None
    return _execucao_output(execucao)


@router.post("/treinos/{treino_id}/garmin/analise", response_model=ExecucaoGarminOutput)
def analisar_com_ia(
    treino_id: str,
    corredor: Corredor = Depends(get_corredor_atual),
    session: Session = Depends(get_session),
):
    treino = _validar_treino_do_corredor(session, corredor, treino_id)
    execucao = session.exec(select(ExecucaoGarmin).where(ExecucaoGarmin.treino_id == treino.id)).first()
    if not execucao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sincronize com o Garmin antes de pedir a análise.",
        )

    blocos = session.exec(select(Bloco).where(Bloco.treino_id == treino.id)).all()

    try:
        resultado = gerar_analise(corredor, treino, blocos, execucao)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Erro ao gerar análise: {e}")

    execucao.analise_texto = resultado["analise_texto"]
    execucao.alertas_json = json.dumps(resultado["alertas"])
    execucao.analisado_em = datetime.utcnow()
    session.add(execucao)
    session.commit()
    session.refresh(execucao)
    return _execucao_output(execucao)

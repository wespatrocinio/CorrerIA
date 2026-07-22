# Especificação do MVP — Planejador de treino de corrida (V1)

## 1. Contexto e escopo

Aplicativo para corredores amadores que se auto-organizam, sem depender de um treinador prescrevendo o plano. O V1 é deliberadamente só um planejador: a pessoa monta o próprio ciclo de treino, semana a semana, com treinos estruturados em blocos.

Fora do escopo do V1, por decisão explícita, para manter o primeiro teste simples:
- Integração com Strava, Garmin Connect ou qualquer relógio/app
- Registro e comparação de treino planejado vs. realizado
- Validação científica de acessórios, suplementos ou práticas de treino
- Periodização automática (fases do ciclo)
- Regras de validação de formulário
- Cálculo de faixas de ritmo a partir de uma prova de referência (ex: VDOT)

Esses pontos ficam descritos na seção 8 como roadmap futuro, mas o modelo de dados já reserva alguns campos para não exigir migração quando chegarem.

## 2. Modelo de dados

### Corredor (perfil)

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| nome | string | |
| faixa_leve | tempo (min/km) | valor central digitado pelo usuário |
| faixa_moderado | tempo (min/km) | idem |
| faixa_forte | tempo (min/km) | idem |
| faixa_muito_forte | tempo (min/km) | idem |

Cada faixa gera um intervalo calculado de ±10s em torno do valor central (não armazenado, calculado em tempo de leitura). Ex: 5:30/km vira um intervalo de 5:20 a 5:40/km.

### Objetivo

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| corredor_id | fk → Corredor | |
| tipo | enum | queima calórica, completar distância, prova, recorde pessoal, outro |
| meta | string, opcional | ex: nome da prova, distância alvo |
| data_alvo | date, opcional | |

### Ciclo

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| objetivo_id | fk → Objetivo | |
| data_inicio | date | |
| duracao_semanas | int | ex: 8, 12, 16 |
| fase | enum, opcional | reservado para o futuro (base, desenvolvimento, pico, polimento) — vazio no V1 |

### Semana

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| ciclo_id | fk → Ciclo | |
| numero | int | posição dentro do ciclo (1 a N) |
| volume_planejado_km | calculado | soma dos treinos da semana |
| volume_planejado_tempo | calculado | soma dos treinos da semana |

### Dia

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| semana_id | fk → Semana | |
| data | date | data real do calendário, derivada da data_inicio do ciclo — não é "terça-feira genérica" |

### Treino

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| dia_id | fk → Dia | |
| tipo | enum | regenerativo, rodagem leve, tempo run, longo, fartlek, VO2, customizado |
| template_estrutural | enum | bloco único constante / aquecimento+principal+desaquecimento / aquecimento+loop+desaquecimento / customizado |
| contexto | enum | rua (ritmo) ou esteira (velocidade) |
| status | enum | planejado, realizado, pulado — só "planejado" é usado no V1, campo reservado |

### Bloco

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| treino_id | fk → Treino | |
| ordem | int | posição dentro do treino |
| tipo | enum | aquecimento, principal, recuperação, desaquecimento, repetição |
| duracao | distância ou tempo | conforme o que a pessoa preferir configurar |
| intensidade | fk → faixa do Corredor | leve, moderado, forte, muito forte — referência viva enquanto o dia não passou |
| intensidade_congelada | tempo (min/km), opcional | preenchido automaticamente na primeira edição de perfil após a data do Dia já ter passado; a partir daí o valor para de acompanhar o perfil |
| repeticoes | int, opcional | só preenchido se tipo = repetição; contém sub-blocos |

## 3. Templates por tipo de treino

| Template | Tipos de treino | Estrutura |
|---|---|---|
| Bloco único constante | Regenerativo, Rodagem leve, Longo | 1 bloco, intensidade constante até distância/tempo alvo |
| Aquecimento + principal + desaquecimento | Tempo Run | 3 blocos, intensidade sobe no bloco central |
| Aquecimento + loop de repetição + desaquecimento | Fartlek, VO2 | repetições configuráveis (nº de séries, ritmo do tiro, ritmo da recuperação) |
| Customizado | — | monta livremente qualquer sequência de blocos |

## 4. Regras de negócio

- Faixas de ritmo digitadas manualmente pelo usuário, não calculadas a partir de prova de referência
- Cada faixa vira um intervalo de ±10s em torno do valor central
- Edição de perfil só afeta dias futuros; dias já passados congelam o valor de intensidade que estava valendo (campo `intensidade_congelada` no Bloco)
- Repetição semanal via duplicação da semana anterior (cópia editável), sem template de semana-tipo nem periodização automática
- Dia vinculado a data real do calendário, não a um dia da semana genérico
- Volume semanal é soma simples (km e tempo), sem quebra por tipo de treino
- Sem regras de validação de formulário no V1
- Sem tela de comparação planejado vs. realizado no V1

## 5. Onboarding

No primeiro acesso, a tela de faixas de ritmo já vem pré-preenchida com valores de referência para iniciante:

| Faixa | Percepção de esforço (talk test) | Valor de referência |
|---|---|---|
| Leve | Dá pra cantar sem esforço | 7:00/km |
| Moderado | Consegue conversar em frases completas | 6:30/km |
| Forte | Só consegue frases curtas | 6:00/km |
| Muito forte | Quase não consegue falar | 5:30/km |

A pessoa pode aceitar sem editar nada ou ajustar livremente — um único botão "Continuar" cobre os dois casos, não existe fluxo de "pular".

## 6. Telas

### Tela 1 — Onboarding (faixas de ritmo)
Objetivo: capturar as faixas de ritmo do corredor com o mínimo de fricção.
- Título + subtítulo explicando que os valores já vêm preenchidos
- 4 linhas (Leve, Moderado, Forte, Muito forte), cada uma com a descrição de percepção de esforço e um campo de ritmo pré-preenchido (ver seção 5)
- Botão único "Continuar"

### Tela 2 — Criar objetivo e ciclo
Objetivo: capturar o objetivo do corredor e os parâmetros do ciclo.
- Seleção única do tipo de objetivo em chips: Prova, Completar uma distância, Recorde pessoal, Queimar calorias, Outro
- Campo de texto livre "Meta" (ex: nome da prova ou distância)
- Campo de data alvo (opcional)
- Campo de data de início do ciclo
- Seleção de duração do ciclo em chips (8, 12 ou 16 semanas)
- Botão "Criar ciclo"

### Tela 3 — Visão do ciclo (lista de semanas)
Objetivo: dar uma visão geral do progresso do ciclo, semana a semana.
- Cabeçalho com objetivo, duração do ciclo, datas e barra de progresso ("Semana 5 de 12")
- Lista de semanas, cada uma mostrando número, intervalo de datas e volume (km, tempo, nº de treinos)
- Quatro estados visuais por semana:
  - Passada: esmaecida, somente leitura
  - Atual: destacada com borda de cor e badge "Semana atual"
  - Futura já planejada: normal, clicável
  - Futura vazia: borda tracejada + botão "Duplicar semana [anterior]"
- Sem indicação de fase de periodização (campo reservado vazio) nem de aderência à meta (dependeria de comparação planejado vs. realizado)

### Tela 4 — Visão da semana (dias)
Objetivo: mostrar o detalhe de uma semana específica, dia a dia.
- Navegação entre semanas (anterior/próxima) + resumo da semana (datas, volume total)
- Lista de 7 dias, cada um mostrando dia + data, tipo de treino (ou "descanso"), ícone de contexto (rua ou esteira), distância e tempo totais
- Cor do rótulo do tipo de treino segue a categoria de template estrutural, não o tipo individual (ex: regenerativo, rodagem leve e longão compartilham a mesma cor)
- Linhas com treino são clicáveis e levam à edição do treino

### Tela 5 — Editar treino (blocos)
Objetivo: configurar os blocos de um treino específico.
- Cabeçalho com data e tipo de treino + seletor de contexto (rua ou esteira), que decide se a intensidade aparece em ritmo (min/km) ou velocidade (km/h)
- Um card por bloco, de acordo com o template do treino:
  - Bloco único constante: um único card (duração + intensidade)
  - Aquecimento + principal + desaquecimento: três cards em sequência
  - Aquecimento + loop de repetição + desaquecimento: card de aquecimento, card de repetição (nº de séries + sub-blocos de tiro e recuperação), card de desaquecimento
  - Customizado: mesma estrutura de cards, com botão de adicionar/remover bloco livremente
- Cada seletor de intensidade mostra o intervalo calculado (ex: "Muito forte · 5:20–5:40/km"), não só o rótulo
- Resumo de distância e tempo total no rodapé, calculado a partir dos blocos, não editável diretamente
- Botão "Salvar treino"

## 7. Stack técnica do protótipo de teste

Decisão: HTML + JS puro, sem framework e sem backend, para o primeiro teste de uso.

Justificativa: nenhuma funcionalidade do V1 depende de servidor — sem integrações externas, sem log de execução, sem múltiplos usuários simultâneos numa mesma conta. Toda a lógica (duplicar semana, congelar intensidade, somar volume) roda no cliente.

- Persistência via `localStorage` do navegador
- Sem autenticação, sem conta de usuário
- Estruturas recursivas (bloco de repetição com sub-blocos) modeladas como objetos/arrays JS aninhados
- Duplicação de semana: cópia profunda do objeto da semana anterior

Limitações conhecidas e aceitas para esta fase:
- Sem acesso multi-dispositivo (dado vive só no navegador onde foi criado)
- Sem backup na nuvem (limpar o navegador apaga o plano)
- Sem visão centralizada de uso — analytics, se necessário, entraria como ferramenta de terceiro, não como backend próprio

Caminho de evolução: um backend leve só para persistência/sincronização é o incremento natural se o teste validar a experiência e for necessário abrir para mais pessoas ou garantir continuidade entre dispositivos — não é retrabalho do que for construído agora.

## 8. Fora de escopo no V1 — roadmap futuro

- Integração com Strava, Garmin Connect e outros relógios/apps
- Registro de execução real e comparação planejado vs. realizado
- Validação científica de acessórios e suplementos (manguito, caneleira, creatina etc.), contextualizada ao perfil e à fase do treino
- Periodização automática por fases do ciclo (campo já reservado no modelo)
- Cálculo de faixas de ritmo a partir de uma prova de referência (ex: metodologia tipo VDOT)
- Regras de validação de formulário
- Cálculo de volume por tipo de treino (base vs. intensidade), hoje só soma tudo junto

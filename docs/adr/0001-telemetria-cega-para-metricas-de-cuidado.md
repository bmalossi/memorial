# 0001 — Telemetria Cega para Métricas de Cuidado

## Contexto e Decisão
Para planejar ações pastorais institucionais e compreender o volume de dores espirituais sem acompanhamento na plataforma, decidimos registrar eventos estatísticos de cuidado (`care_telemetry_events`) de forma puramente desvinculada de qualquer identificador de usuário (`user_id`, e-mail, IP ou hash reversível). A tabela armazena exclusivamente timestamp, plataforma e flag de existência de Contato de Cuidado (`has_care_contact: boolean`).

## Motivação
Armazenar contagens de registros de sofrimento associadas à conta do Leitor criaria um dossiê permanente de vulnerabilidade espiritual e saúde mental no banco de dados, violando a LGPD e o princípio fundamental de "Intimidade sem Vigilância" do Memorial. Com a telemetria cega, a plataforma obtém 100% da inteligência coletiva necessária para ações ministeriais sem nunca comprometer o sigilo individual.

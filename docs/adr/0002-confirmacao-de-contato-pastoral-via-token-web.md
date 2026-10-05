# 0002 — Confirmação de Contato Pastoral via Link Web com Token Único

## Contexto e Decisão
Para que uma pessoa de confiança (pastor, líder) se torne um Contato de Cuidado ativo, o sistema envia um e-mail com link web seguro contendo um token criptográfico único descartável (`bibliavive.com.br/atalaia/aceitar?token=...`). O contato confirma ou declina o papel diretamente no navegador web, sem necessidade de baixar o aplicativo móvel Memorial ou criar conta/senha no Supabase.

## Motivação
Exigir cadastro ou instalação de aplicativo para líderes e pastores criaria atrito severo, resultando em grande número de convites permanentemente pendentes. O link web permite adesão imediata em qualquer dispositivo, apresenta os termos éticos e de sigilo com dignidade editorial e permite que o contato também revogue sua disponibilidade a qualquer momento sem barreiras técnicas.

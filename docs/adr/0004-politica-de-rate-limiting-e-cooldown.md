# 0004 — Política de Rate Limiting e Cooldown do Atalaia

## Contexto e Decisão
Para equilibrar a proteção do Contato de Cuidado contra sobrecarga de e-mails com a prontidão para amparar o Leitor, decidimos implementar uma política de cooldown diferenciada validada no backend pela Edge Function antes de qualquer disparo via Resend:
1. **Mesmo Registro / Situação:** Cooldown estrito de 7 dias para reenvio associado ao mesmo Marco de Fé.
2. **Novo Marco de Fé (Registro Distinto):** Cooldown reduzido para 48 horas entre envios de Sinais de Cuidado.
3. **Pedido Explícito de Ajuda ("Preciso conversar"):** Cooldown de 24 horas. Tentativas adicionais dentro da janela não disparam e-mail, exibem mensagem serena de confirmação do envio anterior e disponibilizam o atalho para o CVV 188.

## Motivação
Um intervalo único de 7 dias deixaria o Leitor desamparado caso passasse por um novo episódio de dor 2 dias depois. Por outro lado, a ausência de limites sobrecarregaria o pastor e esvaziaria o caráter sóbrio do sinal. O cooldown diferenciado reconhece a novidade do evento sem abrir margem para spam.

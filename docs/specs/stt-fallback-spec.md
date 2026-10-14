# Spec — Fallback de transcrição de voz on-device quando a cota estoura

Status: `ready-for-agent`

## Problem Statement

Como Leitor do Memorial, uso a voz para registrar reflexões em segundos, quando digitar não é prático. Hoje a transcrição depende exclusivamente do proxy STT na nuvem (AssemblyAI via `/api/stt`). Para proteger o saldo contra abuso, o backend passará a impor cota e rate limit por usuário. Quando eu atingir a cota, ou quando estiver sem conexão, a captura por voz simplesmente falha e o pensamento se perde justamente no momento em que mais precisava ser guardado.

## Solution

Quando o backend recusar a transcrição por cota estourada (`429 quota_exceeded`), ou quando não houver rede, o app troca automaticamente para o reconhecimento de voz nativo do aparelho, rodando 100% on-device, em português do Brasil. O Leitor continua falando e vendo o texto aparecer, sem custo, sem enviar áudio a nenhum servidor e sem precisar entender o que mudou. Um aviso sereno informa que a transcrição está em modo local e pode ter menos precisão. A degradação é graciosa: o Registro nunca é perdido.

## User Stories

1. Como Leitor, quero que a captura por voz continue funcionando quando minha cota de transcrição premium acabar, para não perder uma reflexão.
2. Como Leitor, quero que a troca para o modo local seja automática, para não precisar configurar nada.
3. Como Leitor, quero ver um aviso discreto de que a transcrição está em modo local e pode errar mais, para saber que devo revisar o texto.
4. Como Leitor, quero que o texto transcrito localmente caia no mesmo campo do Registro que o texto premium, para ter a mesma experiência de edição.
5. Como Leitor, quero poder editar o texto transcrito antes de salvar, para corrigir erros do modo local.
6. Como Leitor sem internet, quero transcrever por voz mesmo offline, para registrar um Marco de Fé em qualquer lugar.
7. Como Leitor, quero que meu áudio não seja enviado a servidor algum no modo local, para preservar a privacidade das minhas memórias íntimas.
8. Como Leitor, quero que o modo local use português do Brasil, para que o resultado reflita como eu falo.
9. Como Leitor, quero que o app peça permissão de microfone e de reconhecimento de voz de forma clara e acolhedora, para entender por que são necessárias.
10. Como Leitor que negou a permissão, quero uma mensagem simples com o caminho para habilitá-la nos Ajustes, para poder voltar a usar a voz.
11. Como Leitor, quero que, se o aparelho não tiver o pacote de idioma pt-BR offline, o app me explique e ofereça baixar ou digitar, para não ficar travado.
12. Como Leitor, quero poder cancelar a gravação no modo local, para descartar um registro que comecei por engano.
13. Como Leitor, quero ver indicação de que estou sendo ouvido (texto parcial aparecendo), para saber que a captura funciona.
14. Como Leitor, quero que o texto parcial seja substituído pelo resultado final, para não ficar com duplicatas.
15. Como Leitor, quero que um silêncio ou fala inaudível gere uma mensagem acolhedora, para saber que devo tentar de novo.
16. Como Leitor, quero que, ao voltar a ter cota (novo período), o app volte automaticamente ao modo premium, para recuperar a melhor qualidade.
17. Como Leitor, quero que falhas de rede momentâneas no modo premium não me joguem para o modo local sem necessidade, para manter a melhor qualidade quando possível.
18. Como Leitor, quero que erros de transcrição do servidor que não sejam de cota exibam mensagem clara, para entender o que aconteceu.
19. Como Leitor, quero que o app não mostre termos técnicos como `429` ou `quota_exceeded`, para ter uma experiência serena.
20. Como Leitor, quero que a captura rápida na barra inferior e o formulário de Novo Registro tenham o mesmo comportamento de fallback, para não ter surpresas.
21. Como Leitor, quero que o áudio gravado localmente seja descartado após a transcrição, para não deixar rastros no aparelho.
22. Como Leitor, quero que o app informe quando o reconhecimento nativo não estiver disponível no aparelho e ofereça digitar, para sempre ter um caminho.
23. Como Leitor, quero que ligações ou interrupções do sistema encerrem a captura sem travar o app, para retomar depois com segurança.
24. Como Leitor de iOS, quero que o reconhecimento use apenas processamento no aparelho, para que nada seja enviado à Apple.
25. Como Leitor de Android, quero que o reconhecimento use o modelo offline do sistema quando disponível, para que nada seja enviado à nuvem.
26. Como desenvolvedor, quero uma única função de transcrição como ponto de entrada, para que os componentes não conheçam o fallback.
27. Como desenvolvedor, quero que o backend sinalize cota estourada com um código estável e inequívoco, para que o app decida o fallback sem inspecionar texto de erro.
28. Como desenvolvedor, quero que a camada de reconhecimento nativo fique atrás de uma interface substituível, para trocar a biblioteca ou adotar `whisper.rn` no futuro.
29. Como desenvolvedor, quero que a decisão de fallback seja testável sem aparelho, para validar a lógica em CI.
30. Como dono do produto, quero que o fallback não exija nenhuma chave nem endpoint, para manter o princípio de zero segredos no cliente.
31. Como dono do produto, quero que o fallback não consuma cota nem o R2, para que o abuso não tenha efeito sobre o custo.
32. Como dono do produto, quero medir quantas transcrições caem no modo local sem identificar o Leitor, para dimensionar a cota (mesma filosofia da telemetria cega).

## Implementation Decisions

- **Gatilhos do fallback.** (a) Resposta do proxy STT indicando cota estourada com código estável `quota_exceeded` (HTTP 429); (b) ausência de conectividade antes de iniciar o envio. Outros erros do servidor (5xx, timeout) não disparam o fallback automático por padrão; mostram erro claro com opção de tentar de novo ou usar modo local manualmente.
- **Motor do fallback.** Reconhecimento de voz nativo via módulo Expo/RN (`expo-speech-recognition`), com locale `pt-BR` e reconhecimento obrigatoriamente on-device. Requer development build (o projeto já usa `expo-dev-client` e `expo prebuild`). A versão e configuração devem ser conferidas na documentação do SDK Expo vigente antes de instalar, conforme `AGENTS.md`, e instalada via `expo install`.
- **Fluxo de captura.** O reconhecimento nativo transcreve a fala em tempo real durante a captura. Assim, no modo local não há etapa de upload nem polling. Isso difere do fluxo premium, que grava, envia e consulta. A decisão de qual motor usar precisa ser tomada **antes** de iniciar a captura, e não depois do áudio gravado. Por isso o app consulta o estado da cota antes de gravar.
- **Verificação de cota.** O backend expõe uma consulta leve de disponibilidade de cota (ou o proxy devolve `quota_exceeded` já na emissão da URL de upload). O app guarda o último estado conhecido em cache curto para evitar latência na abertura da captura. Se o estado for desconhecido, assume premium e, se receber `quota_exceeded`, regrava em modo local e informa o Leitor.
- **Ponto de entrada único.** `transcribeAudioUri` permanece como interface pública para os componentes. A escolha entre motor premium e motor local fica atrás dessa interface (módulo profundo). A camada nativa fica atrás de uma interface própria com métodos de iniciar, parar, cancelar e emitir parciais/final, substituível em testes e em trocas futuras de biblioteca.
- **Contrato de erro do backend.** Resposta 429 com corpo JSON contendo `code: "quota_exceeded"` e, opcionalmente, instante de renovação da cota. O app trata `code` como contrato, nunca o texto da mensagem.
- **Contrato de progresso.** O tipo de progresso existente ganha um estado de modo local (por exemplo, `local`) para a interface exibir o aviso de menor precisão.
- **Privacidade.** No modo local, nenhum áudio ou texto sai do aparelho. No iOS, forçar processamento exclusivamente on-device. No Android, preferir modelo offline e tratar a ausência do pacote pt-BR com orientação ao Leitor.
- **Permissões.** Solicitar microfone e reconhecimento de voz sob demanda, com texto acolhedor, configurados via `app.json`/config plugin (sem editar `ios/` e `android/`).
- **UI.** Aviso sereno e não técnico, sem os termos `429` ou `quota_exceeded`. Vocabulário do domínio: Leitor, Registro. Mesmo comportamento na barra de captura rápida e no formulário de Novo Registro.
- **Telemetria.** Contador agregado e cego de uso do modo local (data e plataforma), sem `user_id`, em linha com ADR-0001. Opcional nesta entrega.
- **Dependência de backend.** Esta spec assume que a cota por usuário e o contrato `quota_exceeded` serão fornecidos pelo backend (ADR-0004 trata de rate limiting e cooldown). O app deve funcionar também se o backend ainda não retornar o código, tratando-o como erro comum.

## Testing Decisions

- **O que é um bom teste aqui.** Verificar comportamento externo de `transcribeAudioUri`: dado o que o backend responde e o que o reconhecedor nativo devolve, qual texto ou erro o chamador recebe e quais estados de progresso são emitidos. Nada de testar chamadas internas ou ordem de funções privadas.
- **Seam único (o mais alto possível).** A função pública `transcribeAudioUri`, com dois colaboradores injetáveis: o cliente HTTP do proxy STT e a interface do reconhecedor nativo. Ambos são simulados nos testes. Nenhum seam novo no nível de componentes.
- **Casos a cobrir.**
  - Cota disponível: usa o fluxo premium e não toca no reconhecedor nativo.
  - Resposta `quota_exceeded`: aciona o reconhecedor nativo em `pt-BR` e devolve o texto final, emitindo o estado de modo local.
  - Sem conectividade: aciona o reconhecedor nativo.
  - Erro 5xx ou timeout: não faz fallback automático e propaga erro claro.
  - Permissão negada: erro acolhedor com orientação.
  - Reconhecimento nativo indisponível ou sem pacote pt-BR: erro acolhedor e caminho alternativo.
  - Fala vazia: mensagem de "nenhuma fala audível".
  - Nenhuma chave ou segredo exportado no cliente (regra já existente).
- **Prior art.** O arquivo de testes existente de `voiceTranscriptionService`, que usa `node:test` e `node:assert`, valida ausência de segredos no cliente, endpoint canônico e rejeição de áudio vazio. Os novos casos seguem o mesmo padrão e o mesmo executor.
- **Verificação manual em aparelho.** Gravação real em iOS e Android (com e sem pacote offline), pois o reconhecimento nativo não é validável em CI.

## Out of Scope

- Implementar a cota, o rate limit por usuário, o JWT, o App Attest/Play Integrity e as demais camadas de segurança do backend (spec separada).
- Modelo local `whisper.rn` (reserva futura, caso a qualidade nativa seja insuficiente).
- Fallback de nuvem com tier gratuito (Groq, Gemini, Workers AI).
- Qualquer tentativa de reter ou enviar o áudio do modo local.
- Mudanças em Atalaia, Triagem de Cuidado ou JEV.
- Suporte a idiomas além de português do Brasil.

## Further Notes

- O código atual aponta o proxy STT para a rota `/api/stt` do Bíblia Vive (AssemblyAI), e não para uma Edge Function do Supabase como no texto do post. A spec se ancora no que o código realmente faz.
- A qualidade do reconhecimento nativo varia por aparelho. Se o feedback mostrar baixa precisão, avaliar `whisper.rn` com modelo `base` baixado sob demanda.
- Bom gancho para o Episódio 12: "Quando a cota acaba, o app não para".

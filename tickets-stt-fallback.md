# Tickets: Fallback de transcrição de voz on-device

Quando a cota de transcrição estoura (ou não há rede), o Memorial passa a transcrever a voz do Leitor no próprio aparelho, em pt-BR, sem custo e sem enviar áudio a servidor. Referência: [stt-fallback-spec.md](./docs/specs/stt-fallback-spec.md).

Work the **frontier**: any ticket whose blockers are all done. Os tickets 3, 4, 5 e 6 podem rodar em paralelo depois do 2.

## Motor de transcrição intercambiável e contrato `quota_exceeded`

**What to build:** Prefactor. A transcrição de voz passa a escolher entre um motor premium (nuvem) e um motor local, ambos atrás de interfaces substituíveis, mantendo um único ponto de entrada para os componentes. Uma resposta de cota estourada do backend (HTTP 429 com `code: "quota_exceeded"`) é reconhecida como sinal de fallback. Outros erros do servidor (5xx, timeout) não trocam de modo automaticamente e exibem erro claro. Verificável apenas com testes.

**Blocked by:** None — can start immediately.

- [x] Existe um único ponto de entrada de transcrição usado pelos componentes, sem que eles conheçam o fallback.
- [x] O motor local é uma interface substituível (iniciar, parar, cancelar, parciais e resultado final), simulável em testes.
- [x] A decisão de fallback depende do `code` da resposta, nunca do texto da mensagem.
- [x] Cota disponível usa o fluxo premium e não toca no motor local.
- [x] Cota estourada aciona o motor local e emite um estado de progresso de modo local.
- [x] Erros 5xx e timeout não disparam o fallback automático.
- [x] A regra de nenhuma chave ou segredo exportado no cliente continua válida.
- [x] Testes cobrem os casos acima, no padrão do arquivo de testes existente.

## Ditado local on-device no Novo Registro

**What to build:** Com a cota estourada, o Leitor fala no formulário de Novo Registro e vê o texto aparecer em tempo real, transcrito pelo reconhecimento nativo do aparelho em português do Brasil, exclusivamente on-device. Um aviso sereno informa que a transcrição está em modo local e que vale revisar o texto. O texto cai no mesmo campo do Registro e pode ser editado antes de salvar.

**Blocked by:** Motor de transcrição intercambiável e contrato `quota_exceeded`

- [x] Módulo de reconhecimento nativo instalado de forma compatível com a versão do SDK Expo do projeto, conforme a documentação vigente.
- [x] Permissões de microfone e reconhecimento de voz configuradas por config plugin, com texto acolhedor.
- [x] Fluxo funcional em development build, com texto parcial substituído pelo final, sem duplicatas.
- [x] Reconhecimento em `pt-BR` e obrigatoriamente on-device; nenhum áudio ou texto sai do aparelho.
- [x] Aviso de modo local exibido sem termos técnicos (`429`, `quota_exceeded`).
- [x] O Leitor pode cancelar a captura e editar o texto antes de salvar.
- [ ] Verificação manual em iOS e Android.

## Mesmo fallback na barra de captura rápida

**What to build:** A captura rápida pela barra inferior tem o mesmo comportamento de fallback do Novo Registro, incluindo o aviso de modo local, para o Leitor não encontrar comportamentos diferentes conforme o ponto de entrada.

**Blocked by:** Ditado local on-device no Novo Registro

- [x] Com a cota estourada, a barra de captura rápida usa o modo local.
- [x] O aviso de modo local é idêntico ao do Novo Registro.
- [x] Cancelamento e edição seguem o mesmo padrão.

## Pré-verificação de cota e gatilho offline

**What to build:** O app decide o motor antes de gravar: consulta o estado da cota com cache curto, vai direto ao modo local quando não há rede e volta sozinho ao premium quando a cota é renovada. Se o estado for desconhecido (backend ainda sem consulta de cota), assume premium e, ao receber `quota_exceeded`, regrava em modo local e informa o Leitor.

**Blocked by:** Ditado local on-device no Novo Registro

- [x] Estado de cota conhecido é guardado em cache curto, sem adicionar latência perceptível na abertura da captura.
- [x] Sem conectividade, a captura usa o modo local.
- [x] Ao renovar a cota, o app volta ao modo premium automaticamente.
- [x] Estado desconhecido assume premium e trata `quota_exceeded` com regravação em modo local.
- [x] Falhas de rede momentâneas no premium não forçam o modo local sem necessidade.
- [x] Testes cobrem cada gatilho e o retorno ao premium.

## Falhas acolhedoras do reconhecimento nativo

**What to build:** Quando o reconhecimento local não puder funcionar, o Leitor recebe uma orientação serena e sempre tem uma saída, como digitar o Registro.

**Blocked by:** Ditado local on-device no Novo Registro

- [x] Permissão negada: mensagem simples com caminho para os Ajustes.
- [x] Pacote pt-BR offline ausente: explicação e opção de baixar ou digitar.
- [x] Reconhecimento indisponível no aparelho: mensagem acolhedora e opção de digitar.
- [x] Fala vazia ou inaudível: mensagem de "nenhuma fala audível" incentivando tentar de novo.
- [x] Interrupção por ligação ou pelo sistema encerra a captura sem travar o app.
- [x] Testes cobrem os casos que não dependem de aparelho.

## Telemetria cega do modo local

**What to build:** Registro estatístico e agregado do uso do modo local, para dimensionar a cota sem identificar o Leitor, na mesma filosofia da Telemetria Cega de Cuidado (ADR-0001). Ticket opcional.

**Blocked by:** Ditado local on-device no Novo Registro

- [x] Evento contém apenas data e plataforma, sem `user_id`, e-mail ou hash.
- [x] Nenhum conteúdo de áudio ou texto é registrado.
- [x] Falha no envio da telemetria nunca afeta a captura de voz.

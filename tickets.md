# Tickets: Atalaia — Sistema de Cuidado Pastoral Silencioso

Implementação vertical e tracer-bullet do Atalaia no Memorial, garantindo amparo pastoral sem quebra de sigilo ou exposição de memórias. Referência: [atalaia-spec.md](./docs/specs/atalaia-spec.md).

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

## Fundações de Dados e Telemetria Cega

**What to build:** O alicerce relacional do Atalaia, provisionando as tabelas dedicadas de contatos pastorais, histórico de alertas e telemetria estatística cega, com políticas de Row Level Security (RLS) que garantem matematicamente que nenhum contato pastoral consiga ler memórias privadas e que eventos de sofrimento coletivo sejam registrados sem qualquer identificador do Leitor.

**Blocked by:** None — can start immediately.

- [x] Tabela `pastoral_contacts` criada com campos para contato, identificação do Leitor (`requester_name`), token web único e índice parcial único para contato ativo.
- [x] Tabela `pastoral_alerts` criada para auditoria técnica de disparos sem campos de texto, títulos ou scores.
- [x] Tabela `care_telemetry_events` criada para telemetria agregada contendo apenas data, plataforma e flag de contato ativo, sem `user_id`, e-mail ou hash.
- [x] Políticas de RLS habilitadas impedindo que qualquer usuário leia dados de terceiros ou acerte queries cruzadas com `user_notes`.
- [x] Tipos TypeScript exportados e alinhados com o esquema do banco.

## Gestão do Contato de Cuidado e Convite Web

**What to build:** A experiência completa de convite e ativação do Contato de Cuidado: o Leitor configura no app seu contato e como quer ser chamado, o sistema despacha um convite por e-mail com link web criptográfico e o pastor aceita ou declina diretamente no navegador sem precisar baixar o aplicativo móvel ou criar conta.

**Blocked by:** Fundações de Dados e Telemetria Cega

- [x] Tela de configuração do Atalaia no Perfil permitindo cadastrar nome, e-mail, papel e o campo obrigatório "Como seu contato deve te chamar".
- [x] Edge Function `send-pastoral-invitation` que gera token seguro descartável e dispara e-mail de convite discreto via Resend.
- [x] Página web pública segura (`/atalaia/confirmar?token=...`) com apresentação solene dos princípios do Atalaia e botões para aceitar ou recusar o papel.
- [x] Endpoint de confirmação que transiciona o status do contato para `active` e atualiza `verified_at`.
- [x] Ações no app para visualizar o status do contato (`Pendente`, `Ativo`), reenviar convite ou revogar o contato imediatamente.

## Triagem de Cuidado no Servidor e Acolhimento Pessoal In-App

**What to build:** O mecanismo seguro de triagem de sofrimento que roda em Edge Function com credenciais protegidas no servidor (sem expor chaves de IA no APK), filtrando rascunhos offline com mais de 48h. Quando um Leitor sem contato ativo registra uma dor profunda, o app apresenta um card sereno de amparo exclusivamente dentro do app com atalho para o CVV 188 e registra a ocorrência na telemetria cega.

**Blocked by:** Fundações de Dados e Telemetria Cega

- [ ] Remoção de qualquer chave de IA ou segredo do bundle do cliente móvel.
- [ ] Edge Function `care-triage` autenticada por JWT que avalia o texto transitoriamente e devolve apenas a flag booleana efêmera `eligible_for_care_prompt`.
- [ ] Filtro no app para enviar à triagem apenas registros criados nas últimas 48 horas durante a sincronização de rascunhos offline.
- [ ] Emissão de evento na tabela `care_telemetry_events` quando a triagem for positiva e o Leitor não possuir contato ativo.
- [ ] Componente `PastoralCareBanner` no modo Acolhimento Pessoal exibido no app com tom acolhedor, incentivo pastoral e botão direto para ligar para o CVV 188.
- [ ] Controle de cooldown local no dispositivo para respeitar o tempo do Leitor e evitar fadiga de avisos.

## Disparo do Sinal de Cuidado com Cooldown Diferenciado

**What to build:** O fluxo de ponte pastoral discreta para o Leitor que possui contato ativo: após um registro difícil, o app sugere o envio de um sinal. Com a confirmação explícita do Leitor, o backend valida as regras de cooldown (7 dias mesmo registro / 48 horas novo registro), despacha um e-mail afetuoso ao pastor sugerindo uma aproximação casual em oração (sem conter nada do memorial) e registra o evento técnico.

**Blocked by:** Gestão do Contato de Cuidado e Convite Web, Triagem de Cuidado no Servidor e Acolhimento Pessoal In-App

- [ ] Componente `PastoralCareBanner` no modo sugestão de sinal exibindo opção de "Enviar sinal de cuidado" e "Agora não".
- [ ] Modal de confirmação explícita destacando que nenhuma palavra da reflexão será enviada ao pastor.
- [ ] Edge Function `send-pastoral-alert` que valida autorização ativa do contato antes do envio.
- [ ] Algoritmo de rate limiting no backend bloqueando reenvios sobre o mesmo registro em menos de 7 dias e permitindo novos registros após 48 horas.
- [ ] Envio de e-mail via Resend com o modelo pastoral discreto sugerindo puxar conversa com naturalidade.
- [ ] Registro do disparo na tabela `pastoral_alerts` com timestamp e status de entrega.

## Pedido Explícito de Ajuda e Histórico de Sinais

**What to build:** O canal direto e prioritário de amparo onde o Leitor pode clicar a qualquer momento em "Preciso conversar com alguém", sem precisar escrever um registro. Aplica janela de proteção de 24 horas, envia e-mail com a devida urgência pastoral e disponibiliza a tela de histórico técnico de sinais para total transparência do Leitor sobre o que foi disparado em seu nome.

**Blocked by:** Disparo do Sinal de Cuidado com Cooldown Diferenciado

- [ ] Ação fixa "Preciso conversar com alguém" disponível permanentemente na tela do Atalaia e como opção secundária nos banners.
- [ ] Diálogo de confirmação rápida antes do disparo de urgência.
- [ ] Edge Function configurada para assunto e corpo de e-mail prioritários informando que o Leitor solicitou ativamente uma conversa ou ligação.
- [ ] Trava de 24 horas no backend: se o Leitor clicar novamente no mesmo dia, exibe confirmação serena de que o contato já foi avisado e disponibiliza o atalho para o CVV 188.
- [ ] Tela de histórico do Atalaia exibindo a lista de sinais enviados com data, tipo (Sinal vs Pedido Direto) e status de envio.

## Bateria Automatizada de Testes de Privacidade e Segurança

**What to build:** Suite de testes automatizados garantindo todas as 10 invariantes obrigatórias de privacidade e segurança da seção 19 do brief, assegurando que o sistema não possua brechas antes da liberação para produção.

**Blocked by:** Pedido Explícito de Ajuda e Histórico de Sinais

- [ ] Teste de isolamento RLS: comprovar que um Contato de Cuidado ativo não consegue consultar nenhuma linha de `user_notes`.
- [ ] Teste de conteúdo: comprovar que os payloads de e-mail e logs nunca contêm texto de registros, referências bíblicas da reflexão, dados de IA ou scores.
- [ ] Teste de consentimento: comprovar que uma memória elegível nunca dispara e-mail automaticamente sem interação explícita do Leitor.
- [ ] Teste de revogação: comprovar que após revogar o contato, qualquer tentativa de disparo é rejeitada imediatamente pelo backend.
- [ ] Teste de anti-spam: comprovar a rejeição de requisições repetidas violando as regras de 7 dias, 48 horas e 24 horas.
- [ ] Teste de telemetria: comprovar que eventos em `care_telemetry_events` são gravados sem nenhum identificador de usuário.

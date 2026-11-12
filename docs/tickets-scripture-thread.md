# Tickets: Consulta de Passagem Bíblica Direta ("Scripture Thread")

Implementação ponta a ponta da Consulta de Passagem Bíblica por intenção natural com TypeSafe JEV e "No AI Slop", ancorada na Spec [Issue #1](https://github.com/bmalossi/memorial/issues/1) e na [ADR 0005](file:///c:/Users/sorai/Desktop/Bruno/Projetos/memorial/memorial-app/docs/adr/0005-consulta-de-passagem-via-jev-sem-texto-gerado.md).

Trabalhe na **fronteira**: qualquer ticket cujos bloqueadores estejam todos concluídos.

---

## [Ticket 1: Deploy e Ativação da Edge Function scripture-thread no Supabase](https://github.com/bmalossi/memorial/issues/2)

**O que constrói:** Implantar e configurar a Supabase Edge Function `scripture-thread` no projeto Supabase ativo, configurando o secret `TYPESAFE_API_KEY`. A função deve responder a requisições com autenticação JWT de usuário, acionar o JEV System One Choice API e aplicar o Confidence Gate (>= 0.80) para retornar versículos em ACF ou status `unclear`.

**Bloqueado por:** Nenhum — pode iniciar imediatamente.

- [ ] Edge Function `scripture-thread` deployada no Supabase via CLI (`supabase functions deploy scripture-thread`).
- [ ] Secret `TYPESAFE_API_KEY` configurado no ambiente de secrets do Supabase.
- [ ] Requisições com JWT válido para passagens do catálogo retornam `status: "matched"` com versículos em ACF.
- [ ] Requisições sem passagem direta retornam `status: "unclear"`.
- [ ] Requisições sem header de autorização retornam 401 Unauthorized.

---

## [Ticket 2: Integração da Consulta de Passagem na Tela de Busca (SearchScreen)](https://github.com/bmalossi/memorial/issues/3)

**O que constrói:** Integrar a consulta direta bíblica via `queryScriptureThread` na barra de busca do Memorial (`SearchScreen`). Quando o Leitor digitar uma dúvida em linguagem natural, a tela consulta o backend. Se uma passagem direta for encontrada, renderiza o `ScriptureResultCard` no topo. Se o retorno for `unclear` ou houver falha de rede, exibe silenciosamente a busca tradicional por palavras-chave sem interrupções ou menções à IA.

**Bloqueado por:** [Ticket 1 (#2)](https://github.com/bmalossi/memorial/issues/2)

- [ ] Campo de busca na tela de busca aciona `queryScriptureThread` ao submeter ou com debounce.
- [ ] Componente `ScriptureResultCard` renderizado no topo quando houver correspondência direta com alta confiança.
- [ ] Transição automática e transparente para busca por palavras-chave quando `unclear`.
- [ ] Zero texto conversacional ou jargões de IA exibidos na interface.
- [ ] Cancelamento seguro de buscas anteriores via `AbortController`.

---

## [Ticket 3: Interatividade das Ações Canônicas (Ler no contexto e Criar Marco)](https://github.com/bmalossi/memorial/issues/4)

**O que constrói:** Conectar as ações canônicas presentes no `ScriptureResultCard` ao fluxo de navegação e de criação do Memorial. Ao clicar em "Ler no contexto", o Leitor é levado para a tela da Bíblia (`BibliaScreen`) com o livro, capítulo e primeiro versículo da passagem selecionados. Ao clicar em "Criar Marco", abre o sheet de novo registro (`NovoRegistroSheet`) com a referência bíblica da passagem pré-preenchida.

**Bloqueado por:** [Ticket 2 (#3)](https://github.com/bmalossi/memorial/issues/3)

- [ ] Botão "Ler no contexto" navega para `BibliaScreen` passando `book_slug`, `chapter` e `verse`.
- [ ] Tela da Bíblia faz scroll suave até o versículo inicial da passagem.
- [ ] Botão "Criar Marco" abre o modal/sheet de criação de memória com o versículo e referência anexados.
- [ ] Ao salvar o marco, a referência bíblica é preservada no registro.

---

## [Ticket 4: Homologação Manual, Bump para Build 19 e Publicação OTA (EAS Update)](https://github.com/bmalossi/memorial/issues/5)

**O que constrói:** Executar a validação manual em aparelhos físicos, documentar a matriz em `docs/homologacao-build19.md`, incrementar o build para 19 (`npm run bump:build`), commitar e enviar para produção via EAS Update através do pipeline de CI/CD.

**Bloqueado por:** [Ticket 3 (#4)](https://github.com/bmalossi/memorial/issues/4)

- [ ] Matriz de homologação manual em `docs/homologacao-build19.md` criada e preenchida.
- [ ] Todos os 166+ testes unitários passando (`npm test`).
- [ ] Checagem de tipos estrita aprovada (`npx tsc --noEmit`).
- [ ] Versionamento incrementado para Build 19 no `app.json` e `src/version.ts`.
- [ ] Pipeline de CI/CD aprovado e publicação OTA via EAS Update concluída com sucesso.

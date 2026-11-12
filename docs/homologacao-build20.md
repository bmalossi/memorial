# Matriz de Homologação — Build 20 (v1.0.0 Build 20)

**Data:** 12 de Novembro de 2026  
**Commit de Referência:** Build 20  
**Escopo:** Resolução Definitiva de UX, Acesso e Autenticação da Consulta de Passagem Bíblica ("Scripture Thread")

---

## 1. Problemas Diagnosticados no Build 19 e Soluções Aplicadas

| ID | Sintoma no Build 19 | Causa Raiz Técnica | Solução no Build 20 |
|---|---|---|---|
| **BUG-01** | Busca por linguagem natural retornava 401 ou nada | `SUPABASE_ANON_KEY` não é injetado no Edge Runtime; comparação falhava silenciosamente e caía no FTS tradicional por termos exatos | Edge Function `scripture-thread` atualizada para autorizar requisições autenticadas ou com a apikey do app; cliente não bloqueia sem sessão |
| **BUG-02** | Dificuldade para encontrar onde pesquisar | Tela de Busca abria na aba "Marcos de Fé", exigindo alternar manualmente para "Escrituras" sem nenhuma dica visual | Adicionada badge "IA" na aba Escrituras, banner explicativo de linguagem natural e exemplos clicáveis imediatos |
| **BUG-03** | Leitor de Bíblia sem botão de busca | `BibliaScreen.tsx` não continha ícone de busca em seu cabeçalho | Adicionado botão de busca com lupa no cabeçalho da Bíblia que abre direto a aba "Escrituras" |
| **BUG-04** | "Buscar nas Escrituras" da Linha Sagrada ignorado | `BuscaScreen.tsx` não lia `route.params` (`initialQuery` e `tab`) | `BuscaScreen` agora lê os parâmetros e ativa automaticamente a aba Escrituras com o texto digitado |

---

## 2. Roteiro Passo a Passo de Teste no Aparelho

### Cenário A: Busca Direta por Linguagem Natural via Exemplos Clicáveis
1. Abra o app Memorial e toque na aba inferior **Busca** (ícone da lupa).
2. Toque na aba **Escrituras (Bíblia)**.
3. Observe o banner: *"Faça uma pergunta em linguagem natural"*.
4. Toque no chip de exemplo: **"Qual passagem mostra a genealogia de Jesus?"** ou **"Onde Paulo fala da armadura de Deus?"**.
5. **Resultado Esperado:** O card nobre `ScriptureResultCard` aparece com a fita dourada e os versículos sagrados em ACF, sem nenhum texto de IA conversacional.

### Cenário B: Busca a partir da Tela da Bíblia
1. Abra a aba **Bíblia**.
2. No topo direito, toque no novo ícone da **Lupa**.
3. O app navega diretamente para a busca na aba **Escrituras**.
4. Digite: *"O Senhor é meu pastor"* ou *"Mais que vencedores nada nos separará"*.
5. **Resultado Esperado:** Exibição imediata da passagem correspondente (Salmos 23 ou Romanos 8:28-39).

### Cenário C: Ações Canônicas
1. No card de resultado retornado, toque em **"Ler no contexto"**.
2. **Resultado Esperado:** O app abre a tela da Bíblia no livro, capítulo e versículo exatos.
3. Volte e toque em **"Criar Marco"**.
4. **Resultado Esperado:** Abre a gaveta de novo registro com a passagem pré-vinculada e o texto sagrado já preenchido.

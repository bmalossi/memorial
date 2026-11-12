# Checklist Técnico de Homologação Manual — Build 19
**Projeto:** Memorial (`memorial-app`)  
**Versão Alvo:** Build 19  
**Data de Criação:** 12/11/2026  
**Status do Documento:** Pronto para Execução Manual  

---

## 1. Identificação da Sessão de Homologação

| Campo | Dados do Teste |
| :--- | :--- |
| **Responsável pela Execução** | `[Preencher Nome do Testador]` |
| **Data e Hora de Início** | `[Preencher AAAA-MM-DD HH:MM]` |
| **Aparelho Android Utilizado** | `[Ex: Samsung Galaxy S22, Pixel 7, etc.]` |
| **Versão do Android** | `[Ex: Android 13, 14, 15]` |
| **Aparelho iOS Utilizado** | `[Ex: iPhone 13, iPhone 15 Pro, etc.]` |
| **Versão do iOS** | `[Ex: iOS 17.x, iOS 18.x]` |
| **Tipo de Binário Testado** | `[ ] Development Build (expo-dev-client)` / `[ ] Preview APK/IPA (EAS)` |

---

## 2. Contexto Técnico e Mudanças no Build 19

O **Build 19** implementa a Consulta Bíblica Direta por Intenção ("Scripture Thread") com inteligência de decisão TypeSafe JEV e guardrail inegociável de "No AI Slop":
1. **Supabase Edge Function `scripture-thread`:** Backend em Deno 2 consumindo a primitiva `Choice` do TypeSafe JEV (`POST https://api.typesafe.ai/v1/systemone`, modelo `jev-latest`).
2. **Confidence Gate ($\ge 0{,}80$):** Validação estrita do índice de confiança. Se for maior ou igual a 0,80 e a escolha não for `none`, busca e fatia os versículos bíblicos canônicos da versão ACF.
3. **Fallback Transparente e Silencioso:** Se `confidence < 0.80`, escolha `none` ou falha de rede/autenticação, o aplicativo móvel transiciona silenciosamente para a busca tradicional por palavras-chave (`searchBibleVerses`), sem emitir mensagens de erro ou jargões de IA.
4. **Componente Editorial `ScriptureResultCard`:** Renderização soberba com fita dourada de cetim, badge ACF, versículos numerados com tipografia serifada (`Georgia`/`serif`) e alto contraste tanto no Modo Escuro Contemplativo quanto no Modo Claro Pergaminho Sagrado.
5. **Ações Canônicas:**
   - Botão **"Ler no contexto"**: Navega diretamente para a `BibliaScreen` abrindo o livro e capítulo com scroll até o primeiro versículo da passagem.
   - Botão **"Criar Marco"**: Abre o `NovoRegistroSheet` com a referência da passagem e os versículos já pré-vinculados.

---

## 3. Matriz de Cenários de Teste

### Cenário 1: Consulta Direta por Intenção (Scripture Thread)

| ID | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :--- | :--- | :---: | :--- |
| **1.1** | 1. Abrir a aba "Busca".<br>2. Tocar na aba "Escrituras (Bíblia)".<br>3. Digitar: `Qual passagem mostra a genealogia de Jesus?` | O `ScriptureResultCard` aparece com destaque no topo exibindo `Mateus 1:1-17`, badge `ACF` e versículos fatiados. Zero texto de IA. | `[ ]` | |
| **1.2** | 1. Digitar uma dúvida sobre o prólogo do Verbo: `Onde diz que no princípio era o Verbo?` | O card é atualizado para `João 1:1-18` com tipografia serifada límpida. | `[ ]` | |
| **1.3** | 1. Digitar uma pergunta sobre armadura espiritual: `armadura de Deus` | Exibe `Efésios 6:10-18` fatiado com clareza. | `[ ]` | |
| **1.4** | 1. No card de resultado, tocar em **"Ler no contexto"**. | O aplicativo navega para a tela "Bíblia", abrindo o livro e capítulo com scroll até o versículo da passagem. | `[ ]` | |
| **1.5** | 1. Retornar à busca e tocar em **"Criar Marco"**. | Abre o sheet de novo registro com a passagem bíblica e texto dos versículos pré-preenchidos. | `[ ]` | |

### Cenário 2: Fallback Transparente por Palavras-Chave

| ID | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :--- | :--- | :---: | :--- |
| **2.1** | 1. Na aba Escrituras, digitar um termo bíblico sem passagem no catálogo (ex: `Gideão`). | O status retorna `unclear` e a tela renderiza silenciosamente os versículos da busca textual por FTS sem exibir alertas. | `[ ]` | |
| **2.2** | 1. Ativar o Modo Avião (offline).<br>2. Digitar qualquer busca. | O app utiliza o fallback local de versículos em memória sem travar ou fechar bruscamente. | `[ ]` | |

### Cenário 3: Alternância de Tema Visual (Dual Theme)

| ID | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :--- | :--- | :---: | :--- |
| **3.1** | 1. No Modo Escuro, verificar o card de passagem. | Fundo escuro contemplativo, borda âmbar suave translúcida, fita dourada e números de versículos em tom quente. | `[ ]` | |
| **3.2** | 1. Alternar para o Modo Claro nas configurações.<br>2. Verificar o card de passagem. | Fundo pergaminho sagrado, borda âmbar bronze, texto perfeitamente legível com alto contraste (WCAG AAA). | `[ ]` | |

---

## 4. Aprovação e Assinatura

- **Data da Homologação:** `[AAAA-MM-DD]`  
- **Veredito:** `[ ] APROVADO PARA PRODUÇÃO` / `[ ] REPROVADO COM RESSALVAS`  
- **Assinatura do Responsável:** `________________________________________________`

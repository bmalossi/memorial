# Spec — Consulta de Passagem Bíblica Direta ("Scripture Thread")

## Problem Statement

Como Leitor do Memorial, muitas vezes me deparo com dúvidas bíblicas específicas ou perguntas em linguagem natural (por exemplo: "Qual passagem mostra a genealogia de Jesus?", "Onde Paulo fala da armadura de Deus?" ou "Em que capítulo está o prólogo do Verbo?"). Ao tentar encontrar essas passagens no aplicativo, enfrento duas frustrações:

1. **Busca por palavras-chave insuficiente:** Motores tradicionais de busca por termos exatos falham quando não lembro das palavras exatas ou quando minha pergunta é conceitual/temática.
2. **Respostas artificiais prolixas ("AI Slop"):** A grande maioria dos aplicativos que integram inteligência artificial gera preâmbulos longos, explicações condescendentes e respostas em texto por extenso (como *"Aqui está a passagem que você pediu..."* ou sínteses teológicas não solicitadas). Isso quebra a santidade contemplativa da leitura, gera atrito visual desnecessário e distrai do texto bíblico em si.

Preciso de uma forma direta de digitar minha dúvida e receber única e exclusivamente a passagem bíblica exata renderizada com dignidade editorial na tela, sem qualquer texto artificial gerado por IA, e com caminhos fluidos para aprofundar na Bíblia ou registrar um Marco de Fé.

## Solution

A **Consulta de Passagem** é uma funcionalidade que conecta a intenção de busca do Leitor à passagem bíblica correspondente de forma 100% estruturada e silenciosa. O princípio norteador é o **"No AI Slop"** e **"Code Owns the Action"**: a inteligência artificial (TypeSafe JEV) atua exclusivamente como roteador estrito de intenção bíblica via primitiva `Choice`, devolvendo um identificador tipado da passagem e um índice de confiança (`confidence`).

A Edge Function `scripture-thread` valida o `Confidence Gate`:
- Se `confidence >= 0.80`, a função busca e fatia os versículos bíblicos diretamente na fonte canônica (versão ACF) e retorna a `Passagem-Alvo` estruturada.
- Se `confidence < 0.80` ou o JEV responder `none`, a função retorna `{ status: "unclear" }`. O aplicativo móvel recebe essa resposta e dispara de forma transparente e silenciosa a busca tradicional por palavras-chave, sem exibir alertas ou mensagens de erro.

No aplicativo móvel, a passagem correspondente é renderizada no componente `ScriptureResultCard`, com tipografia serifada solene, cores quentes em harmonia com o Modo Escuro Canônico e o Modo Claro Pergaminho Sagrado, e botões de ação imediata: "Ler no contexto" (navega para a tela da Bíblia no versículo exato) e "Criar Marco" (abre o formulário de registro com a passagem pré-vinculada).

## User Stories

1. As a Leitor, I want to type a biblical question in natural language (e.g., "Qual passagem mostra a genealogia de Jesus?"), so that I can quickly find the exact scripture passage without knowing its biblical reference by heart.
2. As a Leitor, I want to see only the sacred scripture verses on my screen, so that I am never subjected to conversational AI introductions, polite filler, or unrequested chatbot essays.
3. As a Leitor, I want the scripture text to be displayed in the authentic, classical Almeida Corrigida Fiel (ACF) translation, so that the reading feels reverent and doctrinally stable.
4. As a Leitor, I want the system to require confidence equal to or higher than 80% before declaring a direct match, so that I never receive an incorrect or hallucinated scripture reference.
5. As a Leitor, I want the system to fall back seamlessly to traditional keyword search when my query does not match a known direct passage, so that I always receive relevant results without encountering technical error screens.
6. As a Leitor, I want the search fallback to happen invisibly and silently, so that I never see warnings like "The AI could not understand your prompt".
7. As a Leitor, I want to tap "Ler no contexto" on the scripture result card, so that I am immediately transported to that book and chapter in the full Bible reader with the verse selected.
8. As a Leitor, I want to tap "Criar Marco" on the scripture result card, so that I can immediately start writing a new spiritual reflection anchored to that discovered passage.
9. As a Leitor, I want the scripture card to honor the app's contemplative editorial design in Dark Mode, so that reading at night preserves dark amber accents and high contrast.
10. As a Leitor, I want the scripture card to honor Sacred Parchment Light Mode, so that reading in daylight preserves warm off-white tones and serif typography without harsh glare.
11. As a Leitor, I want to see clear verse numbering and distinct styling for each verse in multi-verse passages, so that I can read the context smoothly.
12. As a Leitor, I want the search input to support clear and submit actions, so that I can refine my questions naturally.
13. As an Authenticated Leitor, I want my session token to be securely transmitted to the Edge Function, so that the endpoint is protected against unauthorized scraping and denial-of-service attacks.
14. As an Unauthenticated Leitor, I want the app to gracefully default to local/keyword search if I am not logged in, so that core scripture access remains available during onboarding.
15. As a Platform Developer, I want the Edge Function to follow the "Code Owns the Action" paradigm, so that business validation, threshold checking, and data retrieval are entirely written in verifiable TypeScript rather than left to prompt engineering.
16. As a Platform Developer, I want a curated static catalog of passage targets in V1, so that query routing is deterministic, low-latency, and requires no auxiliary database round-trips.
17. As a Platform Developer, I want to cancel in-flight search queries with AbortController, so that rapid typing does not cause race conditions or outdated results to overwrite the UI.
18. As a Platform Developer, I want the JEV choice instructions to explicitly compare the user's query against scripture criteria, so that thematic precision is maximized.
19. As a Platform Developer, I want automated unit tests validating the Confidence Gate, so that future modifications to the threshold or payload do not break the fallback contract.
20. As a Platform Developer, I want automated unit tests validating that the Edge Function never outputs non-scriptural natural language strings, so that the "No AI Slop" invariant is guaranteed under continuous integration.

## Implementation Decisions

### 1. Decoupled Architecture and Domain Boundaries
The feature introduces the domain term **Consulta de Passagem**, which uses TypeSafe JEV purely as an intent router. This is structurally separated from **Conexões Bíblicas** (theological typology classification of existing journal entries). JEV does not generate responses, summarize passages, or converse with the user.

### 2. Edge Function Contract (`scripture-thread`)
- **Runtime:** Supabase Edge Function in Deno 2 with TypeScript.
- **Security:** Requires valid user JWT (`Authorization: Bearer <user_token>`).
- **AI Gateway:** Calls TypeSafe JEV (`POST https://api.typesafe.ai/v1/systemone`) with the model `jev-latest` and primitive `Choice`.
- **Confidence Gate Rule:**
  - If `confidence >= 0.80` and `choice !== 'none'`: fetches the chapter JSON from GitHub Raw (`MaatheusGois/bible`), slices the target verse array `[startVerse...endVerse]`, and returns `status: "matched"`.
  - If `confidence < 0.80` or `choice === 'none'`: returns `status: "unclear"`.
- **Response Shape (Protótipo do Contrato):**
```ts
export type ScriptureThreadResponse =
  | {
      status: 'matched';
      confidence: number;
      passage: {
        reference: string;      // ex: "Mateus 1:1-17"
        book_name: string;      // ex: "Mateus"
        book_slug: string;      // ex: "mt"
        chapter: number;        // ex: 1
        start_verse: number;    // ex: 1
        end_verse: number;      // ex: 17
        version: 'acf';
        verses: Array<{
          verse: number;
          text: string;
        }>;
      };
    }
  | {
      status: 'unclear';
    };
```

### 3. Frontend Client Service (`scriptureThreadService.ts`)
- Manages the single high-level seam: `queryScriptureThread(query, options)`.
- Verifies session token; calls `supabase.functions.invoke('scripture-thread', { body: { user_query } })`.
- If response is `unclear`, error, or offline, invokes `searchBibleVerses(query)` from `searchService.ts` and returns `{ type: 'keyword_results', results }`.
- If response is `matched`, returns `{ type: 'direct_passage', passage }`.

### 4. Contemplative Editorial UI Component (`ScriptureResultCard.tsx`)
- Renders the passage header (`reference`, badge `acf`, book metadata).
- Renders verse items with subtle superscripts and serif typography (`Lora-Regular` / `Georgia` / `serif`).
- Supports the app theme tokens: `colors.bg.raised`, `colors.border.DEFAULT`, `colors.amber.DEFAULT`, `colors.text.primary`, `colors.text.secondary`.
- Action buttons:
  - "Ler no contexto" $\rightarrow$ triggers navigation callback `onNavigateToPassage(slug, chapter, verse)`.
  - "Criar Marco" $\rightarrow$ triggers creation callback `onCreateMarco(passage)`.

## Testing Decisions

### 1. Test Philosophy: External Observable Behavior
Tests must verify external behavioral contracts and invariants, never private implementation details:
- When JEV responds with `confidence >= 0.80` and valid target passage, the service must return `type: "direct_passage"` with the exact scripture verses.
- When JEV responds with `confidence < 0.80`, the service must execute the keyword search fallback and return `type: "keyword_results"`.
- When JEV responds with `none`, the fallback must be invoked.
- When network fails or user is unauthenticated, the fallback must be invoked without unhandled exceptions.
- Output payloads must never contain conversational AI strings or markdown introductions.

### 2. Modules to be Tested
- `tests/scriptureThreadService.test.ts`: Integration test suite using the Node.js test runner (`npx tsx --test`), mocking the Supabase Edge Function boundary and Cloudflare FTS endpoint.
- Type integrity verified under strict compiler checks (`npx tsc --noEmit`).

### 3. Prior Art
- `tests/voiceTranscriptionService.test.ts` (boundary mocking, offline fallbacks, quota handling).
- `tests/atalaiaSecurityInvariants.test.ts` (zero data leak invariants).
- `tests/quickCaptureVoiceAutoSubmit.test.ts` (fallback transitions).

## Out of Scope

- Natural language theological explanations, chat interactions, or commentary generation.
- Support for Bible versions other than ACF in the direct query response (ACF is standardized for V1).
- Dynamic database-driven passage catalog management (catalog is statically embedded in Edge Function for V1).
- Audio narration or speech synthesis of the matched passage.

## Further Notes

- Aligns directly with **ADR 0005: Consulta de Passagem via JEV sem Texto Gerado ("No AI Slop")**.
- Aligns with the vocabulary established in `CONTEXT.md`.

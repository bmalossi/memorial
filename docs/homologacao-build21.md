# Homologação Técnica — Build 21

**Data:** 12/11/2026  
**Build:** v1.0.0 (Build 21)  
**Commits:** `d166d90`, `797ad27`  
**Pipeline CI/CD:** GitHub Actions Run `43296926881` (Sucesso / 2m15s)  
**Canal de Publicação:** EAS Update (`preview`)  
**Status dos Testes:** 166 pass / 0 fail (100%)  
**Tipagem TypeScript:** Zero erros (`npx tsc --noEmit`)  

---

## 1. Problema Diagnosticado no Build 20

Ao testar a pergunta *"Onde fala sobre corpos ressuscitados no fim dos tempos?"*, o aplicativo exibia tela vazia ("Nenhum versículo encontrado") por dois fatores estruturais:

1. **Catálogo Curado do JEV Limitado (12 passagens):** O catálogo continha apenas 12 passagens. Ao não encontrar correspondência direta no catálogo, o JEV retornava `choice: "none"`, acionando o fallback transparente.
2. **Aspas Rígidas Forçadas no FTS5:** No fallback `searchBibleVerses`, a query era envolvida compulsoriamente entre aspas (`"${trimmed}"`). O motor FTS5 da Cloudflare buscava a frase literal inteira *"Onde fala sobre corpos ressuscitados no fim dos tempos?"*, que obviamente não existe palavra por palavra no texto bíblico.

---

## 2. Correções Implementadas (Build 21)

### A. Expansão do Catálogo Curado do TypeSafe JEV (55 Passagens Centrais)
Arquivo: [`supabase/functions/scripture-thread/index.ts`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/memorial/memorial-app/supabase/functions/scripture-thread/index.ts)
- Adição de `corinthians_15_resurrection` (1 Coríntios 15:35-58 — O corpo ressurreto, a última trombeta e a vitória sobre a morte).
- Adição de `thessalonians_4_resurrection` (1 Tessalonicenses 4:13-18 — Os mortos em Cristo que ressuscitarão primeiro).
- Adição de passagens basilares de Gênesis a Apocalipse (Criação, Queda, Noé, Sacrifício de Isaque, Mar Vermelho, Dez Mandamentos, Davi e Golias, Salmos 1, 51, 121, 139, Bom Samaritano, Filho Pródigo, Nicodemos, Mulher Samaritana, Bom Pastor, Caminho Verdade e Vida, Videira Verdadeira, Pentecostes, Fruto do Espírito, Galeria da Fé, Nova Jerusalém, etc.).
- Validação estrita de todos os IDs de livros no repositório canônico ACF (`MaatheusGois/bible`).

### B. Extração Inteligente de Palavras-Chave Bíblicas
Arquivo: [`src/lib/searchService.ts`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/memorial/memorial-app/src/lib/searchService.ts)
- Implementação de `extractBibleKeywords(query)` com conjunto abrangente de stop-words do português:
  - Interrogativos: *onde, qual, quais, quem, como, quando, porque, etc.*
  - Verbos de busca: *fala, diz, mostra, relata, ensina, explica, etc.*
  - Termos de metadados: *passagem, versículo, capítulo, bíblia, livro, texto, etc.*
  - Qualificadores contextuais: *fim dos tempos, mundo, dias, etc.*
- Para termos únicos como `"fé"`, as aspas são preservadas para evitar busca por prefixo indesejado (`fe*`).
- Para perguntas em linguagem natural, apenas os termos de conteúdo bíblico são enviados ao FTS.

### C. Relaxamento Automático Multinível
- Se uma consulta com 3 ou mais termos retornar 0 versículos no FTS5, o sistema automaticamente efetua um segundo disparo com o par principal de palavras-chave (`keywords.slice(0, 2)`), garantindo que nenhuma pergunta bíblica legítima retorne tela vazia.

---

## 3. Matriz de Homologação

| Caso de Teste | Entrada do Usuário | Resultado Esperado | Status Verificado |
| :--- | :--- | :--- | :--- |
| **CT-01** | *"Onde fala sobre corpos ressuscitados no fim dos tempos?"* | Retorna **Mateus 27:52** (corpos de santos ressuscitados) e passagens correlatas | ✅ Testado via Worker FTS |
| **CT-02** | *"O que a Bíblia diz sobre o amor de Deus?"* | Retorna **1 João 4:16**, **1 João 4:8** e mais 63 versículos | ✅ Testado (65 resultados) |
| **CT-03** | *"Onde fala sobre a arca de Noé?"* | Retorna **Gênesis 7:9**, **8:6**, **9:18** e mais 11 versículos | ✅ Testado (14 resultados) |
| **CT-04** | *"Onde a jumenta de Balaão falou?"* | Retorna **Números 22:21-27** com a passagem exata | ✅ Testado (7 resultados) |
| **CT-05** | *"Qual passagem mostra a genealogia de Jesus?"* | Retorna card direto da passagem **Mateus 1:1-17** | ✅ Testado via JEV (confiança 0.94) |
| **CT-06** | *"fé"* (palavra única) | Busca exata da palavra *"fé"* sem prefixo (sem trazer "feriu", "festa") | ✅ Preservado |
| **CT-07** | *"no princípio era o verbo"* (com aspas) | Busca literal da citação exata | ✅ Preservado |

---

## 4. Invariantes Sagradas Garantidas
- **Zero AI Slop:** Sem respostas de chatbot, preâmbulos, cumprimentos ou explicações sintéticas. Apenas o texto sagrado ACF.
- **Code Owns the Action:** O roteamento de intenção pertence ao código TypeScript.
- **100% TypeSafe JEV:** Exclusivamente modelo `jev-latest` da TypeSafe AI, sem uso de OpenAI.

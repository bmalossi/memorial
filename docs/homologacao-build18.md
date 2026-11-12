# Checklist Técnico de Homologação Manual — Build 18
**Projeto:** Memorial (`memorial-app`)  
**Versão Alvo:** Build 18  
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

## 2. Contexto Técnico e Mudanças no Build 18

O **Build 18** implementa a identificação e destaque visual de capítulos já lidos na Bíblia do Memorial, em paridade visual e sincronização de dados com o **Bíblia Vive**:
1. **Marcador de Fita Dourada nos Capítulos Lidos:** No modal de seleção de passagens (`BookPickerModal`), capítulos já lidos exibem no topo do chip o marcador de fita dourada (estilo fita de cetim bíblica: altura 3px, largura 14px em cor âmbar/dourada), sutil fundo aquecido e borda âmbar translúcida.
2. **Capítulo Ativo com Destaque Primário:** O capítulo atualmente aberto continua com o destaque âmbar de leitura ativa (`chapterChipCurrent`), mantendo clareza de contexto e leitura.
3. **Persistência Imediata Offline (0ms):** Abertura do capítulo grava instantaneamente o registro no `AsyncStorage` (`@memorial:chapter_views:<slug>`), garantindo que o status de lido apareça imediatamente sem latência de rede.
4. **Sincronização de Leitura com Supabase (`chapter_views`):** Se o usuário estiver autenticado, a leitura é sincronizada de forma bidirecional com a tabela `chapter_views` da mesma base do Supabase utilizada pelo Bíblia Vive.
5. **Mapeamento Canônico de 66 Livros:** Slugs do Memorial (`sl`, `gn`, `joa`, etc.) são convertidos para os IDs canônicos (`psa`, `gen`, `joh`, etc.) da tabela `chapter_views`, garantindo que capítulos lidos no Bíblia Vive sejam reconhecidos no Memorial e vice-versa.
6. **Abertura Inteligente do Livro Ativo:** Ao tocar na pílula de passagem bíblica (ex: "Salmos 23"), o modal abre diretamente na grade de capítulos do livro atual com os marcadores de leitura visíveis, sem obrigar a buscar o livro novamente na lista.

---

## 3. Matriz de Cenários de Teste

### Cenário 1: Leitura e Marcador de Fita Dourada nos Capítulos

| ID | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :--- | :--- | :---: | :--- |
| **1.1** | 1. Abrir a aba "Bíblia".<br>2. Abrir o Salmo 23 e permanecer por 2 segundos. | O capítulo é carregado e lido. O registro é persistido no cache local e sincronizado com o Supabase. | `[ ]` | |
| **1.2** | 1. Tocar na pílula da passagem bíblica no topo ("Salmos 23"). | O modal seletor abre diretamente na grade de capítulos de Salmos. O capítulo 23 está destacado como atual. | `[ ]` | |
| **1.3** | 1. No modal de capítulos de Salmos, selecionar o capítulo 1.<br>2. Aguardar 2 segundos.<br>3. Tocar novamente na pílula da passagem. | O capítulo 23 agora exibe o marcador de fita dourada no topo do chip (indicando que já foi lido). O capítulo 1 é o atual. | `[ ]` | |
| **1.4** | 1. No topo esquerdo do modal de capítulos, tocar no botão `< Livros`. | Retorna para a lista de 66 livros bíblicos com as abas AT e NT e barra de busca funcional. | `[ ]` | |
| **1.5** | 1. Selecionar outro livro (ex: Gênesis). | A grade de capítulos de Gênesis é exibida. Capítulos não lidos não possuem a fita dourada. | `[ ]` | |
| **1.6** | 1. Ativar o Modo Avião no aparelho.<br>2. Ler um capítulo (ex: Gênesis 1).<br>3. Abrir o seletor. | O marcador dourado em Gênesis 1 aparece imediatamente mesmo offline (0ms). Ao desativar o Modo Avião, sincroniza em background. | `[ ]` | |

---

## 4. Aprovação e Assinatura

- **Data da Homologação:** `[AAAA-MM-DD]`  
- **Veredito:** `[ ] APROVADO PARA PRODUÇÃO` / `[ ] REPROVADO COM RESSALVAS`  
- **Assinatura do Responsável:** `________________________________________________`

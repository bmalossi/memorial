# Checklist Técnico de Homologação Manual — Build 17
**Projeto:** Memorial (`memorial-app`)  
**Versão Alvo:** Build 17 (Commit `6f0dc18`)  
**Data de Criação:** 11/11/2026  
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

## 2. Contexto Técnico e Mudanças no Build 17

O **Build 17** implementa correções e aprimoramentos críticos no pipeline nativo de áudio e captura rápida:
1. **Trava contra encerramento prematuro no Android:** O ciclo de vida do gravador (`expo-audio`) agora tolera transições rápidas de `AppState` (`active` -> `background` -> `active` com < 5000ms), impedindo que caixas de diálogo do sistema ou perda efêmera de foco cancelem o áudio.
2. **Proteção contra cliques acidentais / repique:** Gravações com menos de 700ms de duração ignoram cliques adicionais de parada, evitando que toques rápidos interrompam o fluxo.
3. **Auto-submit na Linha Sagrada (`BottomQuickCaptureBar`):** Conclusão do áudio na barra inferior envia automaticamente a memória transcrita para o banco local e Supabase com estado "Registrando memória...".
4. **Fallback STT On-Device (`expo-speech-recognition`):** Transcrição local em `pt-BR` quando offline ou quando a cota da nuvem estoura (código `quota_exceeded` / HTTP 429), com mensagem de modo local serena e sem jargões.
5. **Estabilização Visual:** Eliminação de flickering no banner pastoral e desacoplamento do gravador entre o sheet modal e a barra fixa.

---

## 3. Pré-Requisitos para Execução dos Testes

1. Dispositivo Android físico com o app instalado (via `npx expo run:android` ou arquivo APK do EAS).
2. Dispositivo iOS físico com o app instalado (via `npx expo run:ios` ou build ad-hoc/TestFlight).
3. Conexão estável com a internet (Wi-Fi e 4G) e capacidade de ativar o **Modo Avião**.
4. Conta de usuário de teste autenticada no Supabase.
5. Acesso às Configurações do Sistema em ambos os aparelhos para revogar/conceder permissões manualmente.

---

## 4. Matriz de Cenários de Teste

### Cenário 1: Permissões de Microfone e Reconhecimento de Voz

| ID | Plataforma | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **1.1** | Android | 1. Instalar app do zero ou limpar dados.<br>2. Clicar no botão de microfone na barra rápida. | Diálogo nativo de permissão de microfone é exibido. App não encerra gravação bruscamente ao retornar do diálogo. | `[ ]` | |
| **1.2** | iOS | 1. Instalar app do zero.<br>2. Clicar no botão de microfone na barra rápida. | Diálogo nativo do iOS solicita acesso ao Microfone com texto explicativo acolhedor configurado no `app.json`. | `[ ]` | |
| **1.3** | Android | 1. Negar permissão de microfone.<br>2. Clicar novamente no microfone. | Exibe aviso acolhedor: *"Permissão de Microfone: O Memorial precisa de autorização de microfone para registrar memórias por voz."* App não trava nem crasha. | `[ ]` | |
| **1.4** | iOS | 1. Negar permissão no iOS.<br>2. Clicar novamente no microfone. | Exibe aviso acolhedor orientando a habilitar o microfone nos Ajustes do iOS. | `[ ]` | |
| **1.5** | Ambas | Com a permissão já concedida, iniciar gravação por voz. | Gravação inicia imediatamente; não dispara telas ou atividades intermediárias desnecessárias. | `[ ]` | |

---

### Cenário 2: Captura Rápida de Voz na Linha Sagrada (`BottomQuickCaptureBar`)

| ID | Plataforma | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **2.1** | Ambas | Clicar no microfone, falar frase clara por 3 a 5 segundos e clicar para parar. | Indicador sonoro/visual de gravação ativo. Ao parar, exibe *"Finalizando áudio..."* -> *"Transcrevendo relato..."* -> *"Registrando memória..."* e a memória aparece na Linha Sagrada. | `[ ]` | |
| **2.2** | Ambas | **Teste de Repique:** Clicar no microfone e clicar novamente de forma rápida (< 700ms). | Segundo clique é ignorado pela trava de 700ms; gravação continua ativa sem ser cancelada instantaneamente. | `[ ]` | |
| **2.3** | Ambas | Iniciar gravação, falar e clicar no botão Cancelar (ícone de lixeira ou cancelar). | Gravação é cancelada, buffers descartados, estado visual volta ao normal e nenhum registro é criado. | `[ ]` | |
| **2.4** | Ambas | Digitar um texto no campo (ex: *"Reflexão inicial:"*), iniciar voz, falar algo e parar. | O texto falado é concatenado ao texto pré-existente (`Reflexão inicial:\n\n[texto falado]`) e salvo automaticamente. | `[ ]` | |
| **2.5** | Ambas | Iniciar gravação e permanecer em silêncio absoluto até parar. | Exibe mensagem acolhedora *"Nenhuma Fala Detectada"* e nenhum registro em branco é submetido. | `[ ]` | |

---

### Cenário 3: Captura de Voz no Formulário Completo (`NovoRegistroSheet`)

| ID | Plataforma | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **3.1** | Ambas | Abrir modal de Novo Registro (FAB `+`). Clicar no microfone interno. Falar por 4 segundos e parar. | Texto transcrito é inserido no campo de texto principal do Registro. O formulário **não** fecha sozinho, permitindo ao Leitor revisar. | `[ ]` | |
| **3.2** | Ambas | Com o texto transcrito no campo, editar manualmente palavras e clicar em Salvar. | Alterações manuais são preservadas e o Registro é salvo com o texto corrigido. | `[ ]` | |
| **3.3** | Ambas | Digitar rascunho manual, gravar voz e depois cancelar a gravação. | O rascunho anterior que já estava digitado é preservado intacto. | `[ ]` | |

---

### Cenário 4: Transições de Ciclo de Vida e Sistema Operacional (`AppState`)

| ID | Plataforma | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **4.1** | Android | **Blip Rápido de Background:** Iniciar gravação de voz. Descer a barra de notificações do Android por 1 a 2 segundos e retornar ao app. | Gravação **continua ativa** sem interrupção (tolerância de até 5000ms antes de cancelar). | `[ ]` | |
| **4.2** | Android | **Minimização Prolongada:** Iniciar gravação de voz. Pressionar botão Home/minimizar o app por mais de 6 segundos. Retornar ao app. | Gravação foi cancelada com segurança após 5s em background. App volta limpo, sem travamentos ou estados congelados. | `[ ]` | |
| **4.3** | iOS | Iniciar gravação de voz. Puxar Control Center por 2 segundos e retornar. | Gravação permanece estável sem abortar imediatamente. | `[ ]` | |
| **4.4** | Ambas | **Interrupção de Chamada:** Iniciar gravação e receber uma chamada telefônica real ou alarme de sistema. | Gravador encerra graciosamente sem causar crash no aplicativo. | `[ ]` | |

---

### Cenário 5: Funcionamento do Fallback STT On-Device (Reconhecimento Local)

| ID | Plataforma | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **5.1** | Ambas | **Ativação do Modo Local:** Simular cota estourada ou disparar reconhecimento local via flag/offline. | Exibe aviso sereno de modo local (sem referências a códigos `429` ou `quota_exceeded`). | `[ ]` | |
| **5.2** | Ambas | Falar no modo local e observar a tela durante a fala. | Ditado em tempo real: palavras parciais aparecem na tela conforme o Leitor fala. | `[ ]` | |
| **5.3** | Ambas | Concluir fala no modo local. | O resultado final consolida o texto e substitui parciais, sem duplicação de palavras ou frases. | `[ ]` | |
| **5.4** | Ambas | **Privacidade:** Verificar tráfego de rede durante o modo local. | Nenhum pacote de áudio ou texto é transmitido para servidores remotos (processamento 100% on-device). | `[ ]` | |
| **5.5** | Ambas | **Retorno ao Premium:** Restabelecer cota / rede e iniciar nova gravação. | O app volta automaticamente ao modo de transcrição na nuvem sem requerer configuração manual. | `[ ]` | |

---

### Cenário 6: Comportamento Offline e Tratamento de Falhas

| ID | Plataforma | Procedimento | Comportamento Esperado | Status | Observações |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **6.1** | Ambas | Ativar **Modo Avião** (desconectar Wi-Fi e dados móveis). Iniciar captura por voz. | O app detecta ausência de rede antes do envio e comuta diretamente para o reconhecimento local on-device em `pt-BR`. | `[ ]` | |
| **6.2** | Android | No Modo Avião, verificar se o pacote offline do Google está presente no aparelho. | Se presente, transcreve offline com sucesso. Se ausente, orienta de forma acolhedora sobre o pacote de idioma ou permite digitação. | `[ ]` | |
| **6.3** | iOS | No Modo Avião, ditar em aparelho compatível com ditado local (iOS 15+ / A12 Bionic+). | Reconhecimento nativo do iOS processa a fala offline sem travar o app. | `[ ]` | |
| **6.4** | Ambas | Falha transitória de rede durante uso do motor premium (sem código `quota_exceeded`). | Exibe erro amigável permitindo tentar novamente; não chaveia para modo local erroneamente se for apenas oscilação. | `[ ]` | |

---

## 5. Critérios Objetivos de Aprovação (Definição de Pronto)

Para que o **Build 17** seja considerado **APROVADO para Distribuição Preview**:

* [ ] **Critério 1 (Estabilidade de Gravação):** 0 ocorrências de encerramento imediato do microfone por cliques rápidos ou transições transitórias de tela no Android.
* [ ] **Critério 2 (Auto-Submit):** Gravações na barra de captura rápida salvam a memória automaticamente com título gerado e texto íntegro.
* [ ] **Critério 3 (Preservação de Dados):** Cancelamentos voluntários ou erros de reconhecimento nunca apagam o texto que o Leitor já havia digitado previamente.
* [ ] **Critério 4 (Fallback Gracioso):** No modo offline, o reconhecimento on-device é acionado sem mensagem de erro técnico (`429` ou `quota_exceeded`).
* [ ] **Critério 5 (Ausência de Crashes):** 0 falhas fatais (crash) do aplicativo causadas por permissões negadas, interrupção de chamada ou alternância de estado de áudio.

---

## 6. Registro de Execução e Parecer Final

### Resultados dos Testes

| Plataforma | Total de Testes | Aprovados | Reprovados | Bloqueados |
| :--- | :---: | :---: | :---: | :---: |
| **Android** | 16 | `[  ]` | `[  ]` | `[  ]` |
| **iOS** | 14 | `[  ]` | `[  ]` | `[  ]` |

### Parecer do Homologador

- **Decisão:** `[ ] APROVADO PARA PREVIEW` / `[ ] REPROVADO (REQUER AJUSTES)` / `[ ] APROVADO COM RESSALVAS`
- **Data do Parecer:** `____/____/________`
- **Assinatura / Responsável:** `______________________________________`
- **Ressalvas ou Bugs Encontrados:**
  ```text
  [Registrar aqui eventuais discrepâncias, modelos específicos de aparelho onde houve falha, ou comportamentos inesperados observados durante os testes]
  ```

---

## 7. Limitações e Riscos Conhecidos

1. **Variações de Reconhecimento Offline no Android por Fabricante:**
   - Em dispositivos Android puros (Pixel, Motorola), o pacote de fala offline do Google geralmente vem instalado.
   - Em ROMs customizadas (Xiaomi/HyperOS, Samsung OneUI, Huawei), o pacote offline de `pt-BR` pode exigir download manual prévio nas configurações do teclado/voz do sistema.
2. **Requisitos de Ditado On-Device no iOS:**
   - O ditado offline no iOS exige processadores com Apple Neural Engine (iPhone XS ou superior) e o idioma Português (Brasil) baixado nos ajustes do iOS.
3. **Ambiente Expo Go:**
   - O gravador nativo do `expo-audio` e o módulo `expo-speech-recognition` requerem compilação nativa (`expo-dev-client` / APK de preview) e não funcionam dentro do client genérico Expo Go.
4. **Alerta de Parsing no Grafo MCP:**
   - O parser do `codebase-memory-mcp` possui avisos parciais conhecidos em [`PerfilScreen.tsx`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/memorial/memorial-app/src/screens/main/PerfilScreen.tsx) e migrações SQL, os quais não afetam a compilação nem o comportamento em execução do aplicativo.

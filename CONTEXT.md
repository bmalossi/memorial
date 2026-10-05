# Memorial

Aplicativo móvel do Bíblia Vive para registrar, preservar e revisitar as experiências do Leitor com Deus, ancoradas nas Escrituras. Vocabulário base herdado do `PRODUCT.md` (Leitor, Registro, Marco de Fé, Conexão Bíblica, Linha Sagrada).

## Language

### Atalaia

**Atalaia**:
Recurso opcional de cuidado pastoral que permite ao Leitor, por decisão própria, enviar um Sinal de Cuidado a uma pessoa de confiança. Nunca expõe o conteúdo dos Registros.
_Avoid_: Alerta, monitoramento, vigilância, sistema de detecção

**Contato de Cuidado**:
Pessoa de confiança (pastor, líder, responsável) que o Leitor autorizou e que confirmou o convite. Só recebe Sinais de Cuidado.
_Avoid_: Pastor (como nome do papel no modelo de dados), contato de emergência

**Sinal de Cuidado**:
Mensagem mínima e sem conteúdo privado, enviada ao Contato de Cuidado somente após ação explícita do Leitor.
_Avoid_: Alerta, notificação de crise, denúncia

**Acolhimento Pessoal**:
Orientação serena exibida internamente ao próprio Leitor quando não há Contato de Cuidado ativo, incentivando a busca por amparo pastoral ou comunitário e canais públicos (ex: CVV 188). Não transmite dados a terceiros.
_Avoid_: Alerta de risco, notificação de emergência, aviso punitivo

**Pedido Explícito de Ajuda**:
Ação deliberada e prioritária do Leitor solicitando ativamente uma aproximação ou conversa direta com seu Contato de Cuidado. Tem tratamento prioritário na interface e gera mensagem direta ao contato.
_Avoid_: Botão de pânico, chamado de emergência, SOS, alerta vermelho

### Inteligência

**JEV**:
Tecnologia da TypeSafe. No Memorial é usada exclusivamente para a classificação tipológica das Conexões Bíblicas (`Cumprimento_Profetico`, `Eco_de_Linguagem`, `Contraste_de_Alianca`, `Resposta_de_Oracao`). Não participa do Atalaia.
_Avoid_: Usar "JEV" para qualquer análise de estado emocional

**Triagem de Cuidado**:
Análise interna, distinta do JEV, que decide se um Registro torna apropriado oferecer ao Leitor a possibilidade de um Sinal de Cuidado. Seu resultado nunca é exibido como diagnóstico.
_Avoid_: Detecção de crise, diagnóstico, score de sofrimento, análise emocional

**Candidato a Cuidado**:
Registro que a Triagem de Cuidado considerou apropriado para oferecer o Sinal de Cuidado. É apenas elegibilidade; não dispara envio algum.
_Avoid_: Registro em crise, registro de risco, alerta

**Telemetria Cega de Cuidado**:
Registro estritamente estatístico de ocorrências de cuidado, completamente desvinculado de qualquer identificador do Leitor (`user_id`, e-mail, hash). Utilizado para inteligência pastoral coletiva sem criar dossiês individuais.
_Avoid_: Log de usuário, histórico de crise, rastreador de sofrimento

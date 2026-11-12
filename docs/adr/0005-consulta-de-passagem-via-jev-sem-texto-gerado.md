# 0005 — Consulta de Passagem via JEV sem Texto Gerado ("No AI Slop")

## Contexto e Decisão
Para implementar a consulta bíblica direta por intenção do Leitor em linguagem natural, decidimos:
1. **Zero Texto de IA ("No AI Slop"):** Proibir a geração de respostas conversacionais, preâmbulos ou sínteses textuais por modelos de linguagem (ex.: "Aqui estão os versículos que você pediu:"). A resposta deve ser estritamente o identificador canônico da passagem e o texto bíblico autêntico fatiado da versão ACF.
2. **Princípio "Code Owns the Action":** Delegar ao TypeSafe JEV (`POST https://api.typesafe.ai/v1/systemone`, modelo `jev-latest`) apenas a primitiva de decisão estruturada `Choice`, que retorna a chave da passagem, probabilidades e confiança (`confidence`). O código TypeScript da Edge Function é o único responsável por validar o `Confidence Gate` e buscar os versículos.
3. **Confidence Gate ($\ge 0{,}80$):** Se a confiança for igual ou superior a 0,80 e a escolha não for `none`, a Edge Function busca os versículos canônicos e retorna os dados estruturados. Se a confiança for menor que 0,80 ou a escolha for `none`, a função retorna `{ status: "unclear" }`, permitindo que o cliente acione silenciosamente o fallback tradicional de busca por palavras-chave.
4. **Catálogo Curado Estático (V1):** Na V1, a Edge Function embarca um catálogo curado de passagens bíblicas frequentes para o JEV classificar, evitando consultas extras a bancos e garantindo determinismo.
5. **Autenticação Mandatória:** A Edge Function exige token JWT de sessão autenticada (`Authorization: Bearer <user_token>`).

## Motivação e Trade-offs
A maioria das ferramentas de IA gera respostas conversacionais prolixas e artificiais ("AI slop") que degradam a sobriedade contemplativa do Memorial. Ao forçar a IA a operar exclusivamente como classificador estruturado de intenção bíblica e deixar que o código faça o fatiamento direto da Palavra sagrada sem intermediários, preservamos o caráter sagrado do texto, eliminamos alucinações de citações bíblicas e garantimos tempos de resposta ultrarrápidos e auditáveis.

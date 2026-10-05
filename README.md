# Memorial — Caderno de Memórias Espirituais

> *"Registre o que Deus fez. Descubra onde Ele já havia escrito sobre isso."*

O **Memorial** é o cofre espiritual do Leitor — um aplicativo nativo para iOS e Android desenvolvido para registrar, preservar e contemplar experiências com Deus (testemunhos de fidelidade, orações, reflexões bíblicas e propósitos de consagração). Companion app oficial da plataforma [Bíblia Vive](https://www.bibliavive.com.br).

---

## 🏛️ Propósito e Visão

Enquanto a plataforma web é centrada no estudo e na leitura contínua das Escrituras, o Memorial é centrado na **memória espiritual viva**:
- **A Experiência é a Porta de Entrada, a Palavra é o Destino:** O Leitor registra o que viveu e o motor teológico revela onde as Escrituras já ecoavam aquela realidade.
- **Preservar em vez de Consumir:** Não é um feed de rede social nem um aplicativo de meditação secular; é um altar permanente de marcos espirituais (*Ebenézer* — 1 Samuel 7:12; Josué 4).
- **Intimidade com Privacidade Absoluta:** Seus registros diante de Deus são invioláveis, protegidos por criptografia e políticas estritas de segurança em nível de linha (Supabase RLS).

---

## ⚡ Principais Funcionalidades

### 1. Linha Sagrada (Timeline Espiritual)
- Visualização cronológica contínua com eixo sagrado e nódulos iluminados.
- Contador de fidelidade e gratidão **Ebenézer** (*"Até aqui nos ajudou o Senhor"*).
- Filtragem dinâmica por categorias canônicas: **Reflexão**, **Oração**, **Testemunho**, **Jejum/Propósito** e **Orações Respondidas**.
- Motor de busca rápida por termos, passagens das Escrituras e sugestões de temas bíblicos (Paz, Cura, Provisão, Família, Vitória).

### 2. Conexões Bíblicas & Inteligência Teológica
- Mapeamento teológico executado no servidor via Supabase Edge Function (`memorial-connections`).
- Integração canônica com a taxonomia **TypeSafe JEV** (System One):
  - **Cumprimento Profético:** Tipo, antítipo e promessas cumpridas.
  - **Eco de Linguagem:** Ressonância temática de termos e metáforas bíblicas.
  - **Contraste de Aliança:** Distinção entre sombra e substância, lei e graça.
  - **Resposta de Oração:** Clamor apresentado e evidência da providência divina.
- **Filtro Anti-Gibberish:** Algoritmo estrito de validação linguística (`isMeaningfulText`) que bloqueia caracteres aleatórios e digitação de teste de receberem versículos artificiais.

### 3. Atalaia — Sistema de Cuidado Pastoral Seguro
Arquitetura de amparo mútuo e acolhimento humano fundamentada no princípio:  
> *"O Memorial guarda. O Atalaia cuida."*

- **Pacto de Confidencialidade Inviolável:** O contato pastoral ou intercessor **nunca** recebe o texto de reflexões, orações ou versículos do Leitor. Nenhum dado íntimo é transmitido.
- **Triagem Efêmera no Servidor (`care-triage`):** Avaliação de dor profunda, aflição e esgotamento espiritual sem retenção de diagnósticos clínicos ou rótulos.
- **Banner In-App Contemplativo (`PastoralCareBanner`):**
  - *Modo Acolhimento:* Apresenta canais fraternos e atalho direto ao CVV 188.
  - *Modo Sinal de Cuidado:* Permite que o leitor envie um sinal consentido para que seu contato pastoral ore por ele e puxe conversa com carinho.
- **Gestão de Convites Web Seguros (`send-pastoral-invitation` & `confirm-pastoral-contact`):**
  - Confirmação web criptografada com expiração de 48 horas via e-mail (Resend).
- **Pedido Explícito de Ajuda & Trava de 24h:** Botão de prioridade pastoral com cooldown contra fadiga e integração imediata de suporte.
- **Histórico Técnico de Transparência:** Painel no perfil do Leitor exibindo status de entrega e timestamps técnicos de cada sinal emitido.
- **Telemetria Cega Absoluta (ADR 0001):** Eventos operacionais sanitizados sem qualquer identificador do usuário (`user_id`, e-mail, IP ou hash).

### 4. Transcrição de Voz em Alta Fidelidade
- Integração nativa com a API **AssemblyAI Universal-2** (otimizada para português do Brasil - pt-BR).
- Permite gravar e transcrever orações e testemunhos falados diretamente no modal de novo marco.

### 5. Design System Editorial Contemplativo
- Suporte a dois modos de alta nobreza:
  - **Modo Escuro (Canônico):** Preto profundo e carvão mineral, com acentos em âmbar dourado e tipografia serifada.
  - **Modo Claro (Branco Marfim):** Pergaminho sagrado de papel bíblico, proporcionando descanso visual prolongado (WCAG AAA).
- Diálogos editoriais próprios que eliminam popups genéricos e o visual "AI slop".

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend Mobile** | React Native / Expo (SDK 57) | Arquitetura unificada iOS & Android com TypeScript |
| **Navegação** | React Navigation v6 | Stack nativo com transições fluidas e estado desacoplado |
| **Backend & Auth** | Supabase | PostgreSQL gerenciado, Auth, Realtime e Row Level Security |
| **Serverless Functions** | Supabase Edge Runtime (Deno 2) | Edge Functions em TypeScript para triagem, alertas e conexões |
| **E-mails Transacionais** | Resend API | Notificações pastorais e tokens criptográficos de aceitação |
| **Inteligência Bíblica** | OpenAI (`gpt-4o-mini`) + TypeSafe JEV | Hermenêutica bíblica reverente no servidor |
| **Áudio / Voz** | AssemblyAI | Transcrição de voz em alta fidelidade pt-BR |
| **Testes** | Node.js Test Runner / `tsx` | Bateria com 49 testes de invariantes e segurança |

---

## 📁 Estrutura de Diretórios

```
memorial-app/
├── assets/                  # Ícones, splash screen e marcas oficiais
├── src/
│   ├── components/
│   │   ├── bible/           # Seletores de livros e capítulos bíblicos
│   │   ├── memorial/        # MemorialCard, PastoralCareBanner, AtalaiaContactModal, NovoRegistroSheet
│   │   └── ui/              # Button, InputField, FAB, Modais editoriais
│   ├── lib/
│   │   ├── aiConnectionService.ts     # Integração com Edge Function e filtro anti-gibberish
│   │   ├── atalaiaStore.ts            # Camada de acesso e regras do Atalaia
│   │   ├── atalaiaTypes.ts            # Contratos, invariantes de segurança e sanitização
│   │   ├── memorialStore.ts           # Sincronização offline-first e persistência
│   │   ├── supabase.ts                # Cliente Supabase tipado
│   │   └── types.ts                   # Modelos de dados de memórias e conexões
│   ├── navigation/          # Navegador de abas e pilhas (RootNavigator)
│   ├── screens/
│   │   ├── auth/            # LoginScreen, Recuperação de senha
│   │   └── main/            # LinhasagradaScreen, MarcoDetalheScreen, BibliaScreen, PerfilScreen
│   └── theme/               # Tokens de cor (Dark/Light), espaçamentos, tipografia e sombras
├── tests/                   # Bateria automatizada de invariantes de privacidade e segurança
├── app.json                 # Configuração do Expo / EAS Build
├── package.json
└── tsconfig.json
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js 18+ (recomendado LTS)
- Expo CLI / Expo Go instalado no smartphone (ou emulador Android Studio / Xcode)

### 1. Instalação de dependências
```bash
git clone https://github.com/bmalossi/memorial.git
cd memorial
npm install
```

### 2. Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto contendo as credenciais do Supabase e serviços auxiliares:

```env
# Supabase (compartilhado com Bíblia Vive)
EXPO_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>

# AssemblyAI (Transcrição de áudio em pt-BR)
EXPO_PUBLIC_ASSEMBLYAI_API_KEY=<sua-chave-assemblyai>

# TypeSafe JEV (Classificação tipológica bíblica)
EXPO_PUBLIC_TYPESAFE_API_URL=https://www.bibliavive.com.br/api/scripture-thread
```

> **Nota de Segurança:** As chaves secretas de IA (`OPENAI_API_KEY`) e e-mail (`RESEND_API_KEY`) residem **exclusivamente nos Secrets do servidor Supabase**, garantindo que nenhuma credencial confidencial seja exposta no bundle do aplicativo.

### 3. Execução em Desenvolvimento
```bash
# Iniciar o Metro Bundler
npx expo start

# Para limpar o cache ao iniciar
npx expo start -c
```

Escaneie o QR Code exibido no terminal utilizando o aplicativo **Expo Go**.

### 4. Execução da Bateria de Testes
Para rodar a suíte completa de verificação de tipos e os 49 testes de invariantes de privacidade:

```bash
# Verificação estática de tipos
npx tsc --noEmit

# Executar bateria de testes de invariantes de privacidade e Atalaia
npx tsx --test tests/*.test.ts
```

---

## 🔒 Licença e Direitos Autorais

Copyright © 2026 **Memorial**. Todos os direitos reservados. Este repositório contém código proprietário. A cópia, distribuição ou uso não autorizado de qualquer parte deste sistema é estritamente proibida.

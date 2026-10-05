# Spec — Atalaia: Sistema de Cuidado Pastoral Silencioso do Memorial

## Problem Statement

Como Leitor do Memorial, registro com frequência orações profundas, angústias, períodos de deserto espiritual e pedidos de socorro em meus Marcos de Fé. No entanto, muitas vezes vivencio essas dores em isolamento completo, sem coragem ou iniciativa de procurar meu pastor, líder ou comunidade para pedir ajuda. 

Por outro lado, não quero que ninguém — nem meu pastor, nem minha igreja, nem o aplicativo — leia minhas memórias íntimas, vigie minhas anotações pessoais ou me rotule com diagnósticos psicológicos e espirituais. Preciso de uma ponte silenciosa e digna que me permita sinalizar a uma pessoa de confiança que gostaria de ser lembrado em oração e receber uma palavra de carinho, sem que nenhuma palavra do que escrevi em segredo diante de Deus seja exposta a terceiros.

## Solution

O Atalaia é um recurso opcional e estritamente consentido de cuidado pastoral integrado ao Memorial. O princípio central é imutável: **O Memorial guarda. O Atalaia cuida.**

O Atalaia permite que o Leitor cadastre uma pessoa de confiança (pastor, líder de célula ou responsável pastoral) que confirma o papel via link web seguro sem precisar criar conta ou baixar o aplicativo. Quando o Leitor registra um Marco de Fé recente que expressa dor ou isolamento, uma Triagem de Cuidado segura no servidor identifica a elegibilidade e o aplicativo apresenta internamente uma sugestão serena de aproximação. Somente se o Leitor consentir expressamente, um Sinal de Cuidado mínimo (sem texto, sem IA, sem scores e sem detalhes da memória) é enviado ao e-mail do contato sugerindo uma mensagem pastoral carinhosa.

Caso o Leitor não possua um contato ativo, o sistema oferece Acolhimento Pessoal exclusivamente in-app, incentivando a busca por uma comunidade ou canais de apoio público (CVV 188), enquanto registra telemetria agregada cega (sem qualquer identificador de usuário) para orientar o planejamento pastoral coletivo da plataforma. Além disso, um botão de Pedido Explícito de Ajuda fica permanentemente acessível para que o Leitor possa solicitar conversa direta a qualquer instante, protegido por regras rígidas de rate limiting e respeito ao pastor.

## User Stories

1. As a Leitor, I want to configure an optional Contato de Cuidado in my settings, so that I have a trusted person ready to support me if I need pastoral care.
2. As a Leitor, I want to specify how my Contato de Cuidado knows me (preferred name), so that the pastor immediately recognizes who I am when an invitation or care message arrives.
3. As a Leitor, I want my Contato de Cuidado to explicitly accept an invitation before becoming active, so that no signals are dispatched to someone who has not agreed to the pastoral role.
4. As a Contato de Cuidado, I want to confirm or decline a care invitation through a clean, passwordless web link, so that I can accept the pastoral duty without installing a mobile app or creating an account.
5. As a Contato de Cuidado, I want to understand clearly on the confirmation page that I will never read the Leitor's private memories, so that I know my role is purely pastoral prayer and friendly presence.
6. As a Leitor, I want to revoke my Contato de Cuidado authorization at any moment, so that no further signals or invitations can ever be sent to that person.
7. As a Leitor, I want to replace my Contato de Cuidado, so that an old contact is archived cleanly and a new contact receives the invitation.
8. As a Leitor, I want my private memories, titles, reflections, audio transcriptions, and biblical connections to remain completely inaccessible to my Contato de Cuidado, so that my sacred space of personal confession remains unbroken.
9. As a Leitor, I want the system to perform Triagem de Cuidado securely on the server under my authenticated session without logging my text, so that my sensitive words never leak to third-party logs or APK decompilation.
10. As a Leitor, I want the system to never send any email or care notification automatically based solely on AI evaluation, so that no action occurs without my conscious, deliberate decision.
11. As a Leitor, I want to see a serene, non-judgmental In-App banner suggesting a Sinal de Cuidado when a recent Marco de Fé reflects deep sorrow, so that I am gently reminded I do not need to walk alone.
12. As a Leitor, I want the care suggestion banner to never use clinical, alarmist, or diagnostic language, so that I am never labeled as having a crisis or spiritual failure.
13. As a Leitor, I want the option to dismiss a care suggestion ("Agora não") with a single tap, so that I maintain complete agency over my journey.
14. As a Leitor, I want an explicit final confirmation dialog before a Sinal de Cuidado is dispatched to my pastor, so that I cannot send an alert by accidental touch.
15. As a Contato de Cuidado, I want to receive a minimal, warm email when a Sinal de Cuidado is authorized, so that I know to reach out casually in prayer without pretending to know what happened.
16. As a Contato de Cuidado, I want the care email to contain practical, gentle conversation prompts ("Lembrei de você em oração hoje..."), so that I can approach the Leitor with natural sensitivity.
17. As a Leitor, I want to have a fixed "Preciso conversar com alguém" button in the Atalaia area, so that I can explicitly ask for pastoral contact without being forced to write a full journal entry first.
18. As a Contato de Cuidado, I want to receive a distinct, prioritized email when a Leitor makes a Pedido Explícito de Ajuda, so that I understand this is an active request for a conversation.
19. As a Contato de Cuidado, I want to be protected against inbox flooding, so that I do not receive duplicate care signals from the same Leitor in rapid succession.
20. As a Leitor, I want the system to enforce a 7-day cooldown when attempting to send multiple signals regarding the same Marco de Fé, so that I do not accidentally overwhelm my contact.
21. As a Leitor, I want a reduced 48-hour cooldown when a new, distinct Marco de Fé arises, so that new life events occurring days later can still reach pastoral support.
22. As a Leitor, I want a 24-hour cooldown for Pedido Explícito de Ajuda, so that if I press it again on the same day I receive a comforting assurance that the request was already sent along with public crisis guidance.
23. As a Leitor without an active Contato de Cuidado, I want to receive an In-App Acolhimento Pessoal card instead of an external push, so that my emotional state is never exposed on my smartphone lock screen.
24. As a Leitor, I want immediate, direct access to the CVV 188 channel whenever high-risk distress is present, so that I can reach human life-safety professionals immediately.
25. As a Platform Administrator, I want blind, aggregate telemetry counting moments of unassisted spiritual pain without recording any user ID or reversible hash, so that our leadership can plan church-wide pastoral support without creating dossiers of individual suffering.
26. As a Leitor, I want offline drafts created more than 48 hours ago to be excluded from retroactive care triage upon synchronization, so that old, resolved struggles do not trigger extemporaneous prompts days or weeks later.
27. As a Leitor, I want to review my technical audit history of care signals (date, trigger type, delivery status), so that I have transparency over all communications initiated in my name.

## Implementation Decisions

### 1. Architectural Boundaries and Module Separation
The Atalaia system is decoupled from the JEV theological typology engine. JEV remains exclusively dedicated to canonical typology (`Cumprimento_Profetico`, `Eco_de_Linguagem`, `Contraste_de_Alianca`, `Resposta_de_Oracao`). Care evaluation is performed by an isolated server-side module (`Triagem de Cuidado`) whose single output is an ephemeral boolean flag (`eligible_for_care_prompt`).

### 2. Server-Side Ephemeral Processing
All care triage is executed on demand within a secure Supabase Edge Function (`care-triage`) under the Leitor's authenticated JWT. The AI model credentials reside exclusively in Supabase Secrets, removing all third-party AI keys from the mobile client bundle. The function processes the text in memory and streams nothing to permanent storage.

### 3. Contact Confirmation via Tokenized Web Gateway (ADR 0002)
Pastoral care contacts are confirmed through single-use cryptographic web tokens delivered via transactional email. The target landing page operates on the web domain, allowing pastors and leaders on any operating system to read governance standards, consent to the role, or decline without installing an app or registering an account.

### 4. Dedicated Relational Schema (ADR 0003)
Care contacts are stored in a standalone table with a unique partial index enforcing at most one active contact per Leitor. Historical alert dispatches reference this table via foreign keys, ensuring that revoking or replacing a contact does not destroy audit integrity or contaminate the shared profile table.

### 5. Blind Care Telemetry (ADR 0001)
Global platform metrics tracking unassisted moments of distress are recorded in an anonymous table completely decoupled from user identifiers, IP addresses, or reversible hashes. Rows contain strictly a timestamp, mobile platform type, and a boolean flag indicating the absence of an active contact.

### 6. Differentiated Cooldown Engine (ADR 0004)
The backend alert dispatch function enforces a multi-tiered rate limiting policy against the alerts table prior to invoking transactional email providers:
- Same Marco de Fé: 7-day cooldown.
- Distinct Marco de Fé: 48-hour cooldown.
- Explicit Help Request: 24-hour cooldown.

### 7. Strict In-App Delivery Policy
All personal care reminders, encouragement notices, and invitations to register a pastor are restricted to in-app banners and cards. The system never publishes distress-related messages to push notification payloads on the device lock screen.

### 8. Offline Sync Filter
During batch synchronization of offline entries, only records with creation timestamps within the trailing 48-hour window are forwarded to the care triage gateway. Older entries are committed to storage without evaluation.

## Testing Decisions

### What Makes a Good Test
Tests must verify external behavioral contracts, data boundaries, and strict privacy invariants rather than internal implementation mechanics:
- **Privacy Invariants:** Assert that no memory text, titles, notes, or AI summaries ever appear in email payloads, database alert logs, or telemetry tables.
- **Access Control:** Assert that an active contact cannot read, query, or enumerate any notes or records belonging to the Leitor through Row-Level Security policies.
- **Consent Gateways:** Assert that an eligible care candidate record never triggers automated email dispatch without an explicit, authenticated user action.
- **Rate Limit Enforcements:** Assert that secondary dispatches within 48-hour or 7-day windows are rejected by the backend gateway with appropriate feedback.
- **Revocation Guarantees:** Assert that as soon as a contact status changes to revoked, subsequent dispatch attempts fail immediately.

### Modules Tested
1. **Edge Function Gateway (`care-triage`):** Behavioral evaluation of triage flags, ephemeral handling, and telemetry emission.
2. **Edge Function Dispatcher (`send-pastoral-alert`):** Enforcement of active status, rate limit calculation, and sanitized Resend payload construction.
3. **Database Security Policies (RLS):** Cross-tenant isolation on contacts, alerts, and notes.
4. **Mobile Orchestration Service:** Client state management, confirmation modal flows, offline sync time filtering, and in-app banner cooldowns.

### Prior Art
Testing patterns follow the existing integration and store testing methodologies present in the repository, validating Supabase RPC/RLS invariants and service layer state transitions.

## Out of Scope

- Automated voice calls, SMS, or WhatsApp integration (all communication is transactional email via Resend).
- Direct chat or real-time messaging between Leitor and pastor within the application.
- Public directory or search of local churches or pastors within the app.
- Automated escalation to emergency dispatchers (911/190/SAMU); the app provides informational guidance and links to public crisis services (CVV 188) only.
- Historical mood tracking, diagnostic charts, or mental health reports.

## Further Notes

- The Atalaia system adheres to the brand governance established in `PRODUCT.md` and the domain ubiquitous language defined in `CONTEXT.md`.
- All user-facing copy maintains the contemplative, editorial dignity of Bíblia Vive, avoiding colloquial tech buzzwords and alarmist UI patterns.

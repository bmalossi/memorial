import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type PastoralIntentType =
  | "CRISIS"
  | "THEOLOGICAL_QUERY"
  | "THANKSGIVING"
  | "ANSWERED_PRAYER";

interface EcosystemRequestBody {
  type: PastoralIntentType;
  note_id?: string | null;
  biblical_reference?: string | null;
}

interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * Constrói os templates de e-mail nobres e solenes do Ecossistema de Cuidado Pastoral (4 Pilares).
 * 
 * Regra de Ouro (Invariante de Privacidade):
 * - Jamais expor o texto pessoal, diário secreto ou anotações confidenciais do leitor.
 */
function buildNobleEmailTemplate(params: {
  type: PastoralIntentType;
  userName: string;
  pastorName: string;
  biblicalReference?: string | null;
}): EmailTemplateResult {
  const { type, userName, pastorName, biblicalReference } = params;
  const safeRef = biblicalReference || "Escrituras Sagradas";

  switch (type) {
    case "CRISIS": {
      const subject = `[Sinal do Atalaia] Solicitação de Oração para ${userName}`;
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0D11; color: #EFECE6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #18171D; border: 1px solid #2B2836; border-radius: 12px; padding: 36px 32px;">
    <div style="font-size: 11px; letter-spacing: 2px; color: #E7B075; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">
      BÍBLIA VIVE · ATALAIA · COBERTURA ESPIRITUAL
    </div>
    <h1 style="font-size: 20px; font-weight: 600; color: #F7F5F0; margin: 0 0 16px 0; line-height: 1.4;">
      Solicitação Silenciosa de Cobertura Pastoral
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Olá, <strong>${pastorName}</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 20px 0;">
      O membro <strong>${userName}</strong> autorizou este aviso discreto ao seu coração pastoral. Ele está vivenciando dias pesados e expressou a necessidade de cobertura e amparo em oração neste momento de sua caminhada.
    </p>

    <div style="background-color: #141318; border: 1px solid #282531; border-radius: 8px; padding: 22px 24px; margin: 26px 0; text-align: center;">
      <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D6A369; margin-bottom: 6px; font-weight: 700;">
        Pacto de Confidencialidade
      </div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 15px; color: #F5F2EB; margin-bottom: 10px;">
        "O Memorial guarda. O Atalaia cuida."
      </div>
      <div style="width: 28px; height: 1px; background-color: #383446; margin: 0 auto 12px auto;"></div>
      <p style="font-size: 13px; line-height: 1.6; color: #9E988D; margin: 0; text-align: left;">
        O diário e as orações escritas por ${userName} diante de Deus permanecem invioláveis e estritamente confidenciais. Nenhuma palavra do relato pessoal foi compartilhada.
      </p>
    </div>

    <div style="font-size: 14px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      <strong>Sugestão de aproximação pastoral:</strong><br/>
      Recomendamos um contato natural e fraterno nas próximas horas, sem mencionar alertas automáticos ou causar qualquer desconforto:
      <div style="background-color: #1E1C24; border-left: 3px solid #E7B075; padding: 12px 16px; margin-top: 10px; border-radius: 4px; font-style: italic; color: #F0ECE1; font-size: 13px;">
        "Olá, ${userName}! Deus colocou você no meu coração em oração hoje. Passando para abençoar seu dia e saber como você está."
      </div>
    </div>

    <p style="font-size: 12px; color: #726E7E; margin: 24px 0 0 0; text-align: center;">
      Você recebeu esta notificação porque é o pastor/contato de cuidado ativo cadastrado por ${userName}.
    </p>
  </div>
</body>
</html>
      `.trim();

      const text = `
BÍBLIA VIVE · ATALAIA · COBERTURA ESPIRITUAL
[Sinal do Atalaia] Solicitação de Oração para ${userName}

Olá, ${pastorName}.

O membro ${userName} autorizou este aviso discreto ao seu coração pastoral. Ele está vivenciando dias pesados e expressou a necessidade de cobertura e amparo em oração neste momento de sua caminhada.

"O Memorial guarda. O Atalaia cuida."
Nenhuma palavra do relato pessoal ou oração foi compartilhada.

Sugestão de contato pastoral:
"Olá, ${userName}! Deus colocou você no meu coração em oração hoje. Passando para abençoar seu dia e saber como você está."
      `.trim();

      return { subject, html, text };
    }

    case "THEOLOGICAL_QUERY": {
      const subject = `[Estudo Bíblico] Dúvida de Estudo de ${userName} sobre ${safeRef}`;
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0D11; color: #EFECE6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #18171D; border: 1px solid #2B2836; border-radius: 12px; padding: 36px 32px;">
    <div style="font-size: 11px; letter-spacing: 2px; color: #E7B075; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">
      BÍBLIA VIVE · ESTUDO BÍBLICO · DISCIPULADO
    </div>
    <h1 style="font-size: 20px; font-weight: 600; color: #F7F5F0; margin: 0 0 16px 0; line-height: 1.4;">
      Dúvida de Estudo Bíblico
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Olá, <strong>${pastorName}</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 20px 0;">
      O membro <strong>${userName}</strong> gostaria de tirar uma dúvida de estudo com o senhor sobre a passagem de <strong>${safeRef}</strong> para aprofundar sua caminhada.
    </p>

    <div style="background-color: #141318; border: 1px solid #282531; border-radius: 8px; padding: 20px 24px; margin: 24px 0; text-align: center;">
      <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D6A369; margin-bottom: 6px; font-weight: 700;">
        Passagem Bíblica em Estudo
      </div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #F5F2EB; font-weight: 600;">
        ${safeRef}
      </div>
    </div>

    <div style="font-size: 14px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      <strong>Oportunidade de Ensino & Discipulado:</strong><br/>
      Quando tiver disponibilidade nesta semana, considere enviar um áudio breve ou conversar pessoalmente com ${userName} para esclarecer o contexto histórico, literário e prático desta passagem.
    </div>

    <p style="font-size: 12px; color: #726E7E; margin: 24px 0 0 0; text-align: center;">
      Mensagem enviada com o consentimento de ${userName} através do aplicativo Memorial / Bíblia Vive.
    </p>
  </div>
</body>
</html>
      `.trim();

      const text = `
BÍBLIA VIVE · ESTUDO BÍBLICO · DISCIPULADO
[Estudo Bíblico] Dúvida de Estudo de ${userName} sobre ${safeRef}

Olá, ${pastorName}.

O membro ${userName} gostaria de tirar uma dúvida de estudo com o senhor sobre a passagem de ${safeRef} para aprofundar sua caminhada.

Passagem em estudo: ${safeRef}

Quando tiver disponibilidade, considere enviar uma palavra de orientação ou conversar com ${userName} para esclarecer este contexto bíblico.
      `.trim();

      return { subject, html, text };
    }

    case "THANKSGIVING": {
      const subject = `[Ação de Graças] Notícia de Alegria e Gratidão de ${userName}`;
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0D11; color: #EFECE6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #18171D; border: 1px solid #2B2836; border-radius: 12px; padding: 36px 32px;">
    <div style="font-size: 11px; letter-spacing: 2px; color: #E7B075; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">
      BÍBLIA VIVE · AÇÃO DE GRAÇAS · EDIFICAÇÃO
    </div>
    <h1 style="font-size: 20px; font-weight: 600; color: #F7F5F0; margin: 0 0 16px 0; line-height: 1.4;">
      Nota de Vitória e Gratidão a Deus
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Olá, <strong>${pastorName}</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 20px 0;">
      O membro <strong>${userName}</strong> compartilhou uma nota de vitória e gratidão a Deus hoje para renovar as forças do seu ministério!
    </p>

    <div style="background-color: #141318; border: 1px solid #282531; border-radius: 8px; padding: 22px 24px; margin: 24px 0; text-align: center;">
      <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D6A369; margin-bottom: 6px; font-weight: 700;">
        Ebenézer da Caminhada
      </div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 16px; color: #F5F2EB; margin-bottom: 8px;">
        "Até aqui nos ajudou o Senhor."
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #9E988D; margin: 0;">
        Um marco de alegria foi registrado pelo leitor. Que esta notícia renove seu ânimo e confirme os frutos do seu pastoreio diário.
      </p>
    </div>

    <div style="font-size: 14px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Sinta-se à vontade para enviar uma mensagem curta de celebração para <strong>${userName}</strong> parabenizando-o por esta bênção alcançada!
    </div>

    <p style="font-size: 12px; color: #726E7E; margin: 24px 0 0 0; text-align: center;">
      Compartilhado via aplicativo Memorial / Bíblia Vive com autorização do membro.
    </p>
  </div>
</body>
</html>
      `.trim();

      const text = `
BÍBLIA VIVE · AÇÃO DE GRAÇAS · EDIFICAÇÃO
[Ação de Graças] Notícia de Alegria e Gratidão de ${userName}

Olá, ${pastorName}.

O membro ${userName} compartilhou uma nota de vitória e gratidão a Deus hoje para renovar as forças do seu ministério!

"Até aqui nos ajudou o Senhor."
Um marco de alegria foi registrado diante de Deus. Celebramos juntos este momento da caminhada!
      `.trim();

      return { subject, html, text };
    }

    case "ANSWERED_PRAYER": {
      const subject = `[Oração Respondida] Um milagre na vida de ${userName}!`;
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0D11; color: #EFECE6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #18171D; border: 1px solid #2B2836; border-radius: 12px; padding: 36px 32px;">
    <div style="font-size: 11px; letter-spacing: 2px; color: #E7B075; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">
      BÍBLIA VIVE · TESTEMUNHO · MILAGRE
    </div>
    <h1 style="font-size: 20px; font-weight: 600; color: #F7F5F0; margin: 0 0 16px 0; line-height: 1.4;">
      Oração Atendida pelo Senhor
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Olá, <strong>${pastorName}</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 20px 0;">
      Uma oração apresentada por <strong>${userName}</strong> foi respondida por Deus! Compartilhamos este testemunho para glorificarmos ao Senhor juntos.
    </p>

    <div style="background-color: #141318; border: 1px solid #282531; border-radius: 8px; padding: 22px 24px; margin: 24px 0; text-align: center;">
      <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D6A369; margin-bottom: 6px; font-weight: 700;">
        Fidelidade da Aliança
      </div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 16px; color: #F5F2EB; margin-bottom: 8px;">
        "Clamam os justos, e o Senhor os escuta."
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #9E988D; margin: 0;">
        Um clamor levado a Deus no Memorial foi oficialmente marcado como respondido. O Senhor manifestou Sua fidelidade no tempo perfeito.
      </p>
    </div>

    <div style="font-size: 14px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Aproveite este marco para louvar a Deus junto com <strong>${userName}</strong> e fortalecer a fé de toda a congregação através deste testemunho!
    </div>

    <p style="font-size: 12px; color: #726E7E; margin: 24px 0 0 0; text-align: center;">
      Notificação pastoral gerada com consentimento expresso no aplicativo Memorial / Bíblia Vive.
    </p>
  </div>
</body>
</html>
      `.trim();

      const text = `
BÍBLIA VIVE · TESTEMUNHO · MILAGRE
[Oração Respondida] Um milagre na vida de ${userName}!

Olá, ${pastorName}.

Uma oração apresentada por ${userName} foi respondida por Deus! Compartilhamos este testemunho para glorificarmos ao Senhor juntos.

"Clamam os justos, e o Senhor os escuta."
Um clamor levado a Deus no Memorial foi marcado como respondido. Glorificamos ao Senhor juntos por este marco!
      `.trim();

      return { subject, html, text };
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Atalaia <atalaia@bibliavive.com.br>";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Autenticação obrigatória do Leitor
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida ou expirada" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Extração e validação do payload
    const body: EcosystemRequestBody = await req.json().catch(() => ({ type: "CRISIS" }));
    const type = body.type;
    const noteId = body.note_id || null;
    const biblicalReference = body.biblical_reference || null;

    const validTypes: PastoralIntentType[] = [
      "CRISIS",
      "THEOLOGICAL_QUERY",
      "THANKSGIVING",
      "ANSWERED_PRAYER",
    ];

    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({
          error: "invalid_type",
          message: "Tipo de intenção pastoral inválido. Use CRISIS, THEOLOGICAL_QUERY, THANKSGIVING ou ANSWERED_PRAYER.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verificar contato pastoral com status 'active'
    const { data: contact, error: contactError } = await supabase
      .from("pastoral_contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({
          error: "no_active_contact",
          message: "Você não possui um contato pastoral ativo no momento.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Rate Limiting e Cooldown Diferenciado (ADR 0004)
    const isAdmin = (user?.app_metadata as any)?.role === "admin" || user?.email === "contato@automab.dev";

    if (!isAdmin) {
      const { data: previousAlerts } = await supabase
        .from("pastoral_alerts")
        .select("id, trigger_type, pastoral_intent, note_id, sent_at, delivery_status")
        .eq("user_id", user.id)
        .in("delivery_status", ["delivered", "pending"])
        .order("sent_at", { ascending: false });

      const nowMs = Date.now();
      const alerts = previousAlerts || [];

      if (type === "CRISIS") {
        // Trava de 7 dias para o mesmo registro
        if (noteId) {
          const sameNoteAlert = alerts.find(
            (a: any) =>
              (a.pastoral_intent === "CRISIS" || a.trigger_type === "care_signal") &&
              a.note_id === noteId
          );
          if (sameNoteAlert) {
            const diffMs = nowMs - new Date(sameNoteAlert.sent_at).getTime();
            const limit7dMs = 7 * 24 * 60 * 60 * 1000;
            if (diffMs < limit7dMs) {
              const remainingHours = Math.ceil((limit7dMs - diffMs) / (1000 * 60 * 60));
              return new Response(
                JSON.stringify({
                  error: "rate_limited",
                  reason: "same_note_7d",
                  remaining_hours: remainingHours,
                  message: "Um sinal de oração para este registro já foi enviado recentemente (cooldown de 7 dias).",
                }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }

        // Trava de 48h para novo sinal de crise
        const lastCrisis = alerts.find(
          (a: any) => a.pastoral_intent === "CRISIS" || a.trigger_type === "care_signal"
        );
        if (lastCrisis) {
          const diffMs = nowMs - new Date(lastCrisis.sent_at).getTime();
          const limit48hMs = 48 * 60 * 60 * 1000;
          if (diffMs < limit48hMs) {
            const remainingHours = Math.ceil((limit48hMs - diffMs) / (1000 * 60 * 60));
            return new Response(
              JSON.stringify({
                error: "rate_limited",
                reason: "distinct_note_48h",
                remaining_hours: remainingHours,
                message: "Um sinal de cuidado foi enviado nas últimas 48 horas. Aguarde a aproximação pastoral.",
              }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } else {
        // Para os outros 3 pilares: trava anti-duplicação de 1 hora no mesmo note_id
        if (noteId) {
          const duplicateAlert = alerts.find(
            (a: any) =>
              (a.pastoral_intent === type || a.trigger_type === type) &&
              a.note_id === noteId
          );
          if (duplicateAlert) {
            const diffMs = nowMs - new Date(duplicateAlert.sent_at).getTime();
            const limit1hMs = 60 * 60 * 1000;
            if (diffMs < limit1hMs) {
              return new Response(
                JSON.stringify({
                  error: "rate_limited",
                  reason: "same_note_duplicate",
                  message: "Esta notificação já foi compartilhada com seu pastor recentemente.",
                }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
      }
    }

    // 5. Construir o template solene e nobre correspondente
    const template = buildNobleEmailTemplate({
      type,
      userName: contact.requester_name || "Membro da Igreja",
      pastorName: contact.name,
      biblicalReference,
    });

    let emailSent = false;
    let deliveryStatus = "delivered";

    // 6. Disparo via Resend API
    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [contact.email],
            subject: template.subject,
            html: template.html,
            text: template.text,
          }),
        });

        if (!resendRes.ok) {
          const errText = await resendRes.text();
          console.warn("[send-pastoral-ecosystem-email] Erro retornado pelo Resend:", errText);
          deliveryStatus = "failed";
        } else {
          emailSent = true;
          deliveryStatus = "delivered";
        }
      } catch (err: any) {
        console.warn("[send-pastoral-ecosystem-email] Falha na requisição Resend:", err);
        deliveryStatus = "failed";
      }
    } else {
      console.log("[send-pastoral-ecosystem-email] Modo simulação (RESEND_API_KEY ausente):", {
        to: contact.email,
        type,
        subject: template.subject,
      });
      emailSent = true;
      deliveryStatus = "delivered";
    }

    // 7. Auditoria técnica mínima em pastoral_alerts (zero invasão de privacidade)
    const { data: newAlert, error: insertAlertError } = await supabase
      .from("pastoral_alerts")
      .insert({
        user_id: user.id,
        contact_id: contact.id,
        trigger_type: type,
        pastoral_intent: type,
        note_id: noteId,
        biblical_reference: biblicalReference,
        delivery_status: deliveryStatus,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertAlertError) {
      console.error("[send-pastoral-ecosystem-email] Erro ao gravar auditoria:", insertAlertError);
    }

    // 8. Se houver note_id, atualiza pastoral_alert_sent_types em user_notes
    if (noteId && deliveryStatus === "delivered") {
      try {
        const { data: currentNote } = await supabase
          .from("user_notes")
          .select("pastoral_alert_sent_types")
          .eq("id", noteId)
          .eq("user_id", user.id)
          .maybeSingle();

        const currentTypes: string[] = currentNote?.pastoral_alert_sent_types || [];
        if (!currentTypes.includes(type)) {
          await supabase
            .from("user_notes")
            .update({
              pastoral_alert_sent_types: [...currentTypes, type],
            })
            .eq("id", noteId)
            .eq("user_id", user.id);
        }
      } catch (updateErr) {
        console.warn("[send-pastoral-ecosystem-email] Aviso ao atualizar sent_types:", updateErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: deliveryStatus === "delivered",
        type,
        alert_id: newAlert?.id,
        delivery_status: deliveryStatus,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-pastoral-ecosystem-email] Erro fatal:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

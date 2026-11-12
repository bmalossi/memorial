import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

/**
 * scripture-thread — Supabase Edge Function (Deno 2)
 *
 * Consulta Bíblica Direta por Intenção via TypeSafe JEV (System One).
 * 
 * Regras e Guardrails Inegociáveis (ADR 0005 & CONTEXT.md):
 * 1. Zero Texto de IA ("No AI Slop"): Não gera preâmbulo, conversa ou explicações.
 * 2. Princípio "Code Owns the Action": O JEV atua exclusivamente como roteador estrito
 *    de intenção com a primitiva Choice. O código valida o Confidence Gate (>= 0.80).
 * 3. Confidence Gate: Se confidence >= 0.80, busca versículos canônicos em ACF.
 *    Se confidence < 0.80 ou choice === 'none', retorna status: "unclear".
 * 4. Segurança: Exige token JWT de sessão autenticada do Leitor.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Tipos e Contratos ─────────────────────────────────────────────────────────

export interface ScriptureTargetDefinition {
  reference: string;
  book_name: string;
  book_slug: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  github_id: string;
}

export interface VerseItem {
  verse: number;
  text: string;
}

export type ScriptureThreadResponse =
  | {
      status: "matched";
      confidence: number;
      passage: {
        reference: string;
        book_name: string;
        book_slug: string;
        chapter: number;
        start_verse: number;
        end_verse: number;
        version: "acf";
        verses: VerseItem[];
      };
    }
  | {
      status: "unclear";
    };

// ── Catálogo Curado de Passagens Bíblicas Estáticas (V1) ───────────────────────

export const SCRIPTURE_CATALOG: Record<string, ScriptureTargetDefinition> = {
  matthew_1_genealogy: {
    reference: "Mateus 1:1-17",
    book_name: "Mateus",
    book_slug: "mt",
    chapter: 1,
    start_verse: 1,
    end_verse: 17,
    github_id: "mt",
  },
  luke_3_genealogy: {
    reference: "Lucas 3:23-38",
    book_name: "Lucas",
    book_slug: "lc",
    chapter: 3,
    start_verse: 23,
    end_verse: 38,
    github_id: "lk",
  },
  john_1_prologue: {
    reference: "João 1:1-18",
    book_name: "João",
    book_slug: "joa",
    chapter: 1,
    start_verse: 1,
    end_verse: 18,
    github_id: "jo",
  },
  psalm_23_pastor: {
    reference: "Salmos 23:1-6",
    book_name: "Salmos",
    book_slug: "sl",
    chapter: 23,
    start_verse: 1,
    end_verse: 6,
    github_id: "ps",
  },
  psalm_91_refuge: {
    reference: "Salmos 91:1-16",
    book_name: "Salmos",
    book_slug: "sl",
    chapter: 91,
    start_verse: 1,
    end_verse: 16,
    github_id: "ps",
  },
  beatitudes_matthew_5: {
    reference: "Mateus 5:1-12",
    book_name: "Mateus",
    book_slug: "mt",
    chapter: 5,
    start_verse: 1,
    end_verse: 12,
    github_id: "mt",
  },
  lord_prayer_matthew_6: {
    reference: "Mateus 6:9-13",
    book_name: "Mateus",
    book_slug: "mt",
    chapter: 6,
    start_verse: 9,
    end_verse: 13,
    github_id: "mt",
  },
  ephesians_6_armor: {
    reference: "Efésios 6:10-18",
    book_name: "Efésios",
    book_slug: "ef",
    chapter: 6,
    start_verse: 10,
    end_verse: 18,
    github_id: "eph",
  },
  romans_8_life_spirit: {
    reference: "Romanos 8:28-39",
    book_name: "Romanos",
    book_slug: "rm",
    chapter: 8,
    start_verse: 28,
    end_verse: 39,
    github_id: "rm",
  },
  philippians_4_peace: {
    reference: "Filipenses 4:4-9",
    book_name: "Filipenses",
    book_slug: "fp",
    chapter: 4,
    start_verse: 4,
    end_verse: 9,
    github_id: "ph",
  },
  corinthians_13_love: {
    reference: "1 Coríntios 13:1-13",
    book_name: "1 Coríntios",
    book_slug: "1co",
    chapter: 13,
    start_verse: 1,
    end_verse: 13,
    github_id: "1co",
  },
  isaiah_53_servant: {
    reference: "Isaías 53:1-12",
    book_name: "Isaías",
    book_slug: "is",
    chapter: 53,
    start_verse: 1,
    end_verse: 12,
    github_id: "is",
  },
};

// ── Critérios da Primitiva Choice do JEV ──────────────────────────────────────

const JEV_CRITERIA: Record<string, { what: string; examples: string[] }> = {
  matthew_1_genealogy: {
    what: "Genealogia de Jesus Cristo através de Abraão e Davi em Mateus 1:1-17",
    examples: ["genealogia de Jesus", "gerações de Abraão a Cristo", "linhagem de Jesus em Mateus"],
  },
  luke_3_genealogy: {
    what: "Genealogia de Jesus Cristo até Adão e Deus em Lucas 3:23-38",
    examples: ["ascendência de Jesus até Adão", "genealogia sacerdotal de Lucas", "Jesus filho de José filho de Eli"],
  },
  john_1_prologue: {
    what: "O prólogo do Verbo encarnado e a luz do mundo em João 1:1-18",
    examples: ["No princípio era o Verbo", "o Verbo se fez carne", "a luz que resplandece nas trevas"],
  },
  psalm_23_pastor: {
    what: "O Senhor é o meu pastor e nada me faltará em Salmos 23",
    examples: ["O Senhor é meu pastor", "vale da sombra da morte", "águas tranquilas e cálice transborda"],
  },
  psalm_91_refuge: {
    what: "A proteção e o refúgio do Altíssimo contra o mal em Salmos 91",
    examples: ["esconderijo do Altíssimo", "mil cairão ao teu lado", "aos seus anjos dará ordens a teu respeito"],
  },
  beatitudes_matthew_5: {
    what: "As bem-aventuranças no Sermão da Montanha em Mateus 5:1-12",
    examples: ["bem-aventurados os humildes", "bem-aventurados os que choram", "sermão do monte bem aventurados"],
  },
  lord_prayer_matthew_6: {
    what: "A oração modelo ensinada por Jesus (Pai Nosso) em Mateus 6:9-13",
    examples: ["Pai Nosso", "oração do Pai Nosso", "venha o teu reino seja feita a tua vontade"],
  },
  ephesians_6_armor: {
    what: "A armadura completa de Deus contra as ciladas do diabo em Efésios 6:10-18",
    examples: ["armadura de Deus", "capacete da salvação espada do espírito", "cinto da verdade escudo da fé"],
  },
  romans_8_life_spirit: {
    what: "Todas as coisas cooperam para o bem e o amor de Deus inseparável em Romanos 8:28-39",
    examples: ["todas as coisas cooperam para o bem", "se Deus é por nós quem será contra nós", "mais que vencedores nada nos separará"],
  },
  philippians_4_peace: {
    what: "A paz de Deus que excede o entendimento e a oração sem ansiedade em Filipenses 4:4-9",
    examples: ["não andeis ansiosos por coisa alguma", "a paz de Deus que excede todo o entendimento", "tudo o que é verdadeiro honesto justo puro"],
  },
  corinthians_13_love: {
    what: "O hino ao amor ágape e sua excelência sobre dons espirituais em 1 Coríntios 13:1-13",
    examples: ["o amor é paciente o amor é bondoso", "ainda que eu falasse a língua dos anjos se não tiver amor", "o amor nunca falha"],
  },
  isaiah_53_servant: {
    what: "A profecia do Servo Sofredor que levou sobre si nossas dores em Isaías 53",
    examples: ["ele foi traspassado pelas nossas transgressões", "pelas suas pisaduras fomos sarados", "como ovelha muda perante os tosquiadores"],
  },
  none: {
    what: "Nenhuma das passagens bíblicas conhecidas atende diretamente à dúvida apresentada",
    examples: ["como fazer um bolo", "notícias de política", "dúvida não relacionada a passagens bíblicas centrais"],
  },
};

// ── Helpers de Busca de Versículos ───────────────────────────────────────────

/**
 * Busca e fatia versículos da tabela 'verses' no PostgreSQL ou via GitHub Raw ACF como fallback.
 */
async function fetchPassageVerses(
  target: ScriptureTargetDefinition,
  supabaseClient: ReturnType<typeof createClient>
): Promise<VerseItem[]> {
  // 1. Tenta buscar na tabela 'verses' do PostgreSQL/Supabase
  try {
    const { data, error } = await supabaseClient
      .from("verses")
      .select("verse, text")
      .eq("book_slug", target.book_slug)
      .eq("chapter", target.chapter)
      .gte("verse", target.start_verse)
      .lte("verse", target.end_verse)
      .order("verse", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        verse: Number(row.verse),
        text: String(row.text).trim(),
      }));
    }
  } catch {
    // Se a tabela não existir ou estiver vazia, prossegue para o GitHub Raw
  }

  // 2. Fonte Canônica ACF via GitHub Raw (MaatheusGois/bible)
  try {
    const url = `https://raw.githubusercontent.com/MaatheusGois/bible/main/versions/pt-br/acf/${target.github_id}/${target.github_id}.json`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const json = await res.json();
      const chIdx = target.chapter - 1;
      const rawVerses: string[] = json?.chapters?.[chIdx] || [];

      const sliced: VerseItem[] = [];
      for (let v = target.start_verse; v <= target.end_verse; v++) {
        const text = rawVerses[v - 1];
        if (text) {
          sliced.push({ verse: v, text: text.trim() });
        }
      }

      if (sliced.length > 0) {
        return sliced;
      }
    }
  } catch (err) {
    console.warn("[scripture-thread] Falha no fetch GitHub Raw ACF:", err);
  }

  return [];
}

// ── Handler Principal da Edge Function ────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Suporte a CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Verificação de Autenticação Mandatória (JWT do Usuário)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida ou expirada" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validação da Requisição
    const body = await req.json().catch(() => ({}));
    const userQuery = typeof body.user_query === "string" ? body.user_query.trim() : "";

    if (!userQuery) {
      return new Response(
        JSON.stringify({ error: "Campo 'user_query' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Chamada ao TypeSafe JEV System One API (Primitiva Choice)
    const jevApiKey = Deno.env.get("TYPESAFE_API_KEY") || Deno.env.get("JEV_API_KEY") || "";
    
    // Fallback gracioso para ambiente de testes sem API key configurada
    if (!jevApiKey) {
      console.warn("[scripture-thread] TYPESAFE_API_KEY não configurada. Retornando status unclear.");
      const unclearResp: ScriptureThreadResponse = { status: "unclear" };
      return new Response(JSON.stringify(unclearResp), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jevPayload = {
      state: {
        user_query: userQuery,
      },
      model: "jev-latest",
      questions: {
        target_passage: {
          type: "choice",
          instructions: {
            question: "Qual bloco de passagens bíblicas atende diretamente à dúvida apresentada em `user_query`?",
            compare: ["`user_query`"],
            focus: "Identificar a passagem bíblica exata que responde à pergunta do usuário.",
          },
          criteria: JEV_CRITERIA,
        },
      },
    };

    const jevResponse = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jevApiKey}`,
      },
      body: JSON.stringify(jevPayload),
    });

    if (!jevResponse.ok) {
      console.warn(`[scripture-thread] JEV respondeu status ${jevResponse.status}`);
      const unclearResp: ScriptureThreadResponse = { status: "unclear" };
      return new Response(JSON.stringify(unclearResp), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jevData = await jevResponse.json();
    const answer = jevData?.answers?.target_passage;
    const choice = typeof answer?.choice === "string" ? answer.choice : "none";
    const confidence = typeof answer?.confidence === "number" ? answer.confidence : 0;

    // 4. Aplicação do Confidence Gate (Regra: confidence >= 0.80 e choice !== 'none')
    if (confidence < 0.80 || choice === "none" || !SCRIPTURE_CATALOG[choice]) {
      const unclearResp: ScriptureThreadResponse = { status: "unclear" };
      return new Response(JSON.stringify(unclearResp), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Recuperação dos Versículos Canônicos em ACF
    const target = SCRIPTURE_CATALOG[choice];
    const verses = await fetchPassageVerses(target, supabase);

    if (verses.length === 0) {
      // Se não encontrou os versículos, aciona fallback limpo
      const unclearResp: ScriptureThreadResponse = { status: "unclear" };
      return new Response(JSON.stringify(unclearResp), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Resposta Estruturada Sagrada (Zero AI Slop)
    const matchedResp: ScriptureThreadResponse = {
      status: "matched",
      confidence,
      passage: {
        reference: target.reference,
        book_name: target.book_name,
        book_slug: target.book_slug,
        chapter: target.chapter,
        start_verse: target.start_verse,
        end_verse: target.end_verse,
        version: "acf",
        verses,
      },
    };

    return new Response(JSON.stringify(matchedResp), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[scripture-thread] Erro não tratado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no processamento da consulta bíblica" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

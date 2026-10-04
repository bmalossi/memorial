/**
 * aiConnectionService.ts — Bíblia Vive / Memorial
 *
 * Módulo de inteligência teológica e conexões bíblicas.
 * Integração canônica com:
 * 1. OpenAI (gpt-4o-mini): Identificação de passagens bíblicas conectadas e síntese espiritual sóbria.
 * 2. TypeSafe JEV (System One): Classificação tipológica canônica:
 *    - Cumprimento_Profetico (Tipo/Antítipo, promessa e cumprimento)
 *    - Eco_de_Linguagem (Ressonância temática de termos bíblicos)
 *    - Contraste_de_Alianca (Sombra vs Substância, Lei vs Graça)
 *    - Resposta_de_Oracao (Clamor apresentado e evidência da providência/fidelidade)
 */

import { AiConnection, JevCategory, MemorialEntry } from './types';
import { updateMemorialAiConnections } from './memorialStore';

const OPENAI_API_KEY =
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  '';

const TYPESAFE_API_URL =
  process.env.EXPO_PUBLIC_TYPESAFE_API_URL ||
  'https://bibliavive.com.br/api/scripture-thread';

export interface AiGenerationResult {
  connections: AiConnection[];
  jevCategory: JevCategory;
}

/**
 * Conexões bíblicas de fallback contextual em caso de modo offline ou falha de rede
 */
function getFallbackConnections(entry: MemorialEntry): AiGenerationResult {
  switch (entry.category) {
    case 'oracao':
      return {
        jevCategory: 'Resposta_de_Oracao',
        connections: [
          {
            reference: 'Filipenses 4:6-7',
            verse_text:
              'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica, com ações de graças.',
            explanation:
              'O clamor colocado em oração encontra repouso na promessa de paz que excede todo o entendimento humano.',
            book_slug: 'fp',
            chapter: 4,
            verse: 6,
            jev_category: 'Resposta_de_Oracao',
            confidence: 0.94,
          },
          {
            reference: 'Salmos 34:17',
            verse_text:
              'Clamam os justos, e o Senhor os escuta e os livra de todas as suas tribulações.',
            explanation:
              'A promessa de que nenhuma súplica sincera passa desapercebida pelo Senhor.',
            book_slug: 'sl',
            chapter: 34,
            verse: 17,
            jev_category: 'Resposta_de_Oracao',
            confidence: 0.91,
          },
        ],
      };

    case 'testemunho':
      return {
        jevCategory: 'Cumprimento_Profetico',
        connections: [
          {
            reference: 'Salmos 126:3',
            verse_text: 'Com efeito, grandes coisas fez o Senhor por nós; por isso, estamos alegres.',
            explanation:
              'O memorial de fidelidade testifica publicamente que a graça de Deus se manifestou de forma palpável na sua história.',
            book_slug: 'sl',
            chapter: 126,
            verse: 3,
            jev_category: 'Cumprimento_Profetico',
            confidence: 0.96,
          },
          {
            reference: '1 Samuel 7:12',
            verse_text:
              'Tomou então Samuel uma pedra, e a pôs entre Mispá e Sem, e lhe chamou Ebenézer, e disse: Até aqui nos ajudou o Senhor.',
            explanation:
              'Como a pedra de Ebenézer, este registro funciona como um marco visível de auxílio divino preservado para a memória.',
            book_slug: '1sm',
            chapter: 7,
            verse: 12,
            jev_category: 'Cumprimento_Profetico',
            confidence: 0.93,
          },
        ],
      };

    case 'jejum':
      return {
        jevCategory: 'Contraste_de_Alianca',
        connections: [
          {
            reference: 'Isaías 58:6',
            verse_text:
              'Porventura não é este o jejum que escolhi: que soltes as ligaduras da impiedade, que desfaças as ataduras da servidão...?',
            explanation:
              'O jejum bíblico opera uma mudança interior de coração, alinhando a consagração pessoal à justiça e à misericórdia de Deus.',
            book_slug: 'is',
            chapter: 58,
            verse: 6,
            jev_category: 'Contraste_de_Alianca',
            confidence: 0.95,
          },
          {
            reference: 'Mateus 6:17-18',
            verse_text:
              'Tu, porém, quando jejuares, unge a tua cabeça e lava o teu rosto... e teu Pai, que vê em secreto, te recompensará.',
            explanation:
              'A consagração na Nova Aliança é íntima e silenciosa diante do Pai, que acolhe a dedicação do coração.',
            book_slug: 'mt',
            chapter: 6,
            verse: 17,
            jev_category: 'Contraste_de_Alianca',
            confidence: 0.92,
          },
        ],
      };

    case 'reflexao':
    default:
      return {
        jevCategory: 'Eco_de_Linguagem',
        connections: [
          {
            reference: 'Salmos 119:105',
            verse_text: 'Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.',
            explanation:
              'A reflexão sobre a Palavra ilumina as decisões práticas e discerne a direção divina em meio aos caminhos do leitor.',
            book_slug: 'sl',
            chapter: 119,
            verse: 105,
            jev_category: 'Eco_de_Linguagem',
            confidence: 0.95,
          },
          {
            reference: 'Hebreus 4:12',
            verse_text:
              'Porque a palavra de Deus é viva e eficaz, e mais cortante do que qualquer espada de dois gumes...',
            explanation:
              'O texto das Escrituras penetra a consciência e molda o discernimento espiritual do coração.',
            book_slug: 'hb',
            chapter: 4,
            verse: 12,
            jev_category: 'Eco_de_Linguagem',
            confidence: 0.90,
          },
        ],
      };
  }
}

/**
 * Invoca a OpenAI (gpt-4o-mini) com prompt teológico para mapear conexões
 * canônicas e classificar na taxonomia TypeSafe JEV.
 */
export async function generateBibleConnections(
  entry: MemorialEntry
): Promise<AiGenerationResult> {
  const cleanKey = OPENAI_API_KEY.trim();

  // Sem chave configurada? Use o fallback reverente
  if (!cleanKey) {
    console.log('[AiService] OPENAI_API_KEY não configurada, usando fallback contextual.');
    return getFallbackConnections(entry);
  }

  const systemPrompt = `Você é o motor de hermenêutica bíblica e inteligência teológica do Memorial (Bíblia Vive).
Sua missão solene é analisar o relato de fé do leitor (uma oração, um testemunho de milagre/provisão, uma reflexão bíblica ou um propósito de jejum) e identificar de 1 a 3 passagens bíblicas canônicas fundamentais que convergem com aquela experiência vivida.

DIRETRIZES FUNDAMENTAIS:
1. Reverência e Gravitas: A IA atua como uma lâmpada para as Escrituras, jamais como conselheiro loquaz ou bajulador. Sem AI slop, sem floreios vazios.
2. Fidelidade Textual: Citações das Escrituras devem corresponder estritamente ao texto bíblico em português (Almeida ARA/ARC). Nunca alucine versículos.
3. Taxonomia TypeSafe JEV (System One):
   Classifique o padrão teológico dominante do relato e de cada conexão em exatamente uma destas 4 categorias:
   - "Cumprimento_Profetico": prefiguração, tipo e antítipo, promessa bíblica cumprida na aliança ou na vida do leitor.
   - "Eco_de_Linguagem": ressonância temática, repetição de termos ou metáforas bíblicas fundamentais (ex: cordeiro, rocha, fonte, coluna, tempestade).
   - "Contraste_de_Alianca": distinção reveladora entre sombra e substância, lei e graça, obras humanas e favor divino.
   - "Resposta_de_Oracao": clamor, súplica ou petição do leitor que encontra evidência de providência ou intervenção divina nas Escrituras.

FORMATO DE SAÍDA:
Retorne OBRIGATORIAMENTE um objeto JSON válido no seguinte formato:
{
  "primary_jev_category": "Cumprimento_Profetico" | "Eco_de_Linguagem" | "Contraste_de_Alianca" | "Resposta_de_Oracao",
  "connections": [
    {
      "reference": "Salmos 34:18",
      "book_slug": "sl",
      "chapter": 34,
      "verse": 18,
      "verse_text": "Perto está o Senhor dos que têm o coração quebrantado, e salva os de espírito oprimido.",
      "explanation": "Explicação editorial breve e profunda (máx 2 frases) de como esta passagem ressoa com a experiência do leitor.",
      "jev_category": "Resposta_de_Oracao",
      "confidence": 0.95
    }
  ]
}

Regras para book_slug: use slugs bíblicos padronizados em minúsculas (ex: gn, ex, lv, nm, dt, js, jz, rt, 1sm, 2sm, 1rs, 2rs, 1cr, 2cr, ed, ne, et, jo, sl, pv, ec, ct, is, jr, lm, ez, dn, os, jl, am, ob, jn, mq, na, hc, sf, ag, zc, ml, mt, mc, lc, joa, at, rm, 1co, 2co, gl, ef, fp, cl, 1ts, 2ts, 1tm, 2tm, tt, fm, hb, tg, 1pe, 2pe, 1jo, 2jo, 3jo, jd, ap).`;

  const userPrompt = `DADOS DO MARCO DE FÉ:
- Categoria: ${entry.category.toUpperCase()}
- Título: ${entry.title || 'Sem título específico'}
- Passagem Associada Inicialmente: ${entry.bible_ref?.display || 'Nenhuma informada'}
- Tags: ${entry.tags?.join(', ') || 'Nenhuma'}
- Relato do Leitor:
"""
${entry.content}
"""

Analise com solenidade e retorne as conexões bíblicas no formato JSON estrito.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[AiService] OpenAI retornou HTTP ${response.status}:`, errText);
      return getFallbackConnections(entry);
    }

    const data = await response.json();
    const contentText = data?.choices?.[0]?.message?.content;

    if (!contentText) {
      console.warn('[AiService] Resposta vazia da OpenAI.');
      return getFallbackConnections(entry);
    }

    const parsed = JSON.parse(contentText);

    const validCategories: JevCategory[] = [
      'Cumprimento_Profetico',
      'Eco_de_Linguagem',
      'Contraste_de_Alianca',
      'Resposta_de_Oracao',
    ];

    const primaryCategory: JevCategory = validCategories.includes(
      parsed.primary_jev_category
    )
      ? parsed.primary_jev_category
      : entry.category === 'oracao'
      ? 'Resposta_de_Oracao'
      : entry.category === 'testemunho'
      ? 'Cumprimento_Profetico'
      : 'Eco_de_Linguagem';

    const rawConnections = Array.isArray(parsed.connections)
      ? parsed.connections
      : [];

    const connections: AiConnection[] = rawConnections.map((c: any) => ({
      reference: String(c.reference || 'Escritura Sagrada'),
      verse_text: String(c.verse_text || ''),
      explanation: String(c.explanation || ''),
      book_slug: String(c.book_slug || 'sl').toLowerCase(),
      chapter: Number(c.chapter) || 1,
      verse: Number(c.verse) || 1,
      jev_category: validCategories.includes(c.jev_category)
        ? c.jev_category
        : primaryCategory,
      confidence: typeof c.confidence === 'number' ? c.confidence : 0.92,
    }));

    if (connections.length === 0) {
      return getFallbackConnections(entry);
    }

    return {
      connections,
      jevCategory: primaryCategory,
    };
  } catch (err: any) {
    console.warn('[AiService] Erro ao invocar OpenAI:', err?.message || err);
    return getFallbackConnections(entry);
  }
}

/**
 * Gera conexões bíblicas e persiste diretamente nos metadados da nota no Supabase
 */
export async function attachAiConnectionsToMemorial(
  id: string,
  entry: MemorialEntry
): Promise<MemorialEntry> {
  const result = await generateBibleConnections(entry);

  // Se o ID for válido e não for mock temporário, persiste no Supabase
  if (id && !id.startsWith('mock_')) {
    try {
      await updateMemorialAiConnections(id, result.connections, result.jevCategory);
    } catch (err) {
      console.warn('[AiService] Falha ao persistir no Supabase, mantendo no estado local:', err);
    }
  }

  return {
    ...entry,
    ai_status: 'done',
    ai_connections: result.connections,
    jev_category: result.jevCategory,
  };
}

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
import { supabase } from './supabase';

/**
 * Validador de qualidade de texto.
 * Impede que digitação aleatória (ex: "skdoaskdoaskdo") receba versículos artificiais.
 */
export function isMeaningfulText(text: string): boolean {
  const trimmed = (text || '').trim();
  if (trimmed.length < 12) return false;

  // Bloco contínuo sem espaços (ex: "skdoaskdoaskdo", "asdfasdfasdf")
  if (!trimmed.includes(' ') && trimmed.length >= 8) return false;

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 2) return false;

  // Repetição de caracteres contínuos (ex: "aaaaaa", "kkkkkkk")
  if (/(.)\1{4,}/i.test(trimmed)) return false;

  // Sequências de 5 ou mais consoantes seguidas (gibberish aleatório)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(trimmed)) return false;

  return true;
}

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
  // 1. Verificação de integridade: Digitação aleatória (ex: "skdoaskdoaskdo") ou texto vazio
  // jamais deve receber conexões bíblicas artificiais.
  if (!isMeaningfulText(entry.content)) {
    return {
      connections: [],
      jevCategory: 'Eco_de_Linguagem',
    };
  }

  // 2. Chamar Edge Function segura no servidor Supabase (com a chave OpenAI dos Secrets)
  try {
    const { data, error } = await supabase.functions.invoke('memorial-connections', {
      body: {
        text: entry.content,
        title: entry.title,
        category: entry.category,
        bibleRef: entry.bible_ref,
        tags: entry.tags,
        entryId: entry.id,
        sessionId: entry.id,
      },
    });

    if (!error && data) {
      if (data.empty || !Array.isArray(data.connections) || data.connections.length === 0) {
        return {
          connections: [],
          jevCategory: data.jev_category || 'Eco_de_Linguagem',
        };
      }

      const validCategories: JevCategory[] = [
        'Cumprimento_Profetico',
        'Eco_de_Linguagem',
        'Contraste_de_Alianca',
        'Resposta_de_Oracao',
      ];

      const primaryCategory: JevCategory = validCategories.includes(data.jev_category)
        ? data.jev_category
        : 'Eco_de_Linguagem';

      const connections: AiConnection[] = data.connections.map((c: any) => ({
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

      return {
        connections,
        jevCategory: primaryCategory,
      };
    }
  } catch (err: any) {
    console.warn('[AiService] Erro ao invocar memorial-connections no Supabase:', err?.message || err);
  }

  // 3. Fallback somente se for texto real e estruturado (em caso de rede offline)
  if (isMeaningfulText(entry.content)) {
    return getFallbackConnections(entry);
  }

  return {
    connections: [],
    jevCategory: 'Eco_de_Linguagem',
  };
}

/**
 * Gera conexões bíblicas e persiste diretamente nos metadados da nota no Supabase
 */
export async function attachAiConnectionsToMemorial(
  id: string,
  entry: MemorialEntry
): Promise<MemorialEntry> {
  const result = await generateBibleConnections(entry);
  const hasConnections = result.connections.length > 0;

  // Se o ID for válido e não for mock temporário, persiste no Supabase
  if (id && !id.startsWith('mock_')) {
    try {
      await updateMemorialAiConnections(
        id,
        result.connections,
        hasConnections ? result.jevCategory : undefined
      );
    } catch (err) {
      console.warn('[AiService] Falha ao persistir no Supabase, mantendo no estado local:', err);
    }
  }

  return {
    ...entry,
    ai_status: hasConnections ? 'done' : 'none',
    ai_connections: result.connections,
    jev_category: hasConnections ? result.jevCategory : undefined,
  };
}

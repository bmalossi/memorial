/**
 * searchService.ts — Motor de Busca do Memorial
 *
 * Integra a busca local instantânea nas memórias espirituais
 * e a busca bíblica FTS conectada à infraestrutura do Bíblia Vive.
 */

import { MemorialEntry } from './types';
import { normalizeBookSlug } from './bibleData';

export interface BibleSearchResult {
  id: string;
  reference: string;
  bookName: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  text: string;
}

// Fallback bíblico local para versículos conhecidos caso esteja offline
const LOCAL_BIBLE_VERSES: BibleSearchResult[] = [
  {
    id: 'sl-23-1',
    reference: 'Salmos 23:1',
    bookName: 'Salmos',
    bookSlug: 'sl',
    chapter: 23,
    verse: 1,
    text: 'O SENHOR é o meu pastor, nada me faltará.',
  },
  {
    id: 'sl-23-4',
    reference: 'Salmos 23:4',
    bookName: 'Salmos',
    bookSlug: 'sl',
    chapter: 23,
    verse: 4,
    text: 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
  },
  {
    id: 'fp-4-6',
    reference: 'Filipenses 4:6',
    bookName: 'Filipenses',
    bookSlug: 'fp',
    chapter: 4,
    verse: 6,
    text: 'Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças.',
  },
  {
    id: 'fp-4-7',
    reference: 'Filipenses 4:7',
    bookName: 'Filipenses',
    bookSlug: 'fp',
    chapter: 4,
    verse: 7,
    text: 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.',
  },
  {
    id: 'fp-4-19',
    reference: 'Filipenses 4:19',
    bookName: 'Filipenses',
    bookSlug: 'fp',
    chapter: 4,
    verse: 19,
    text: 'O meu Deus, segundo as suas riquezas em glória, suprirá todas as vossas necessidades em Cristo Jesus.',
  },
  {
    id: 'rm-8-28',
    reference: 'Romanos 8:28',
    bookName: 'Romanos',
    bookSlug: 'rm',
    chapter: 8,
    verse: 28,
    text: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.',
  },
  {
    id: 'rm-8-31',
    reference: 'Romanos 8:31',
    bookName: 'Romanos',
    bookSlug: 'rm',
    chapter: 8,
    verse: 31,
    text: 'Que diremos, pois, a estas coisas? Se Deus é por nós, quem será contra nós?',
  },
  {
    id: 'sl-91-1',
    reference: 'Salmos 91:1',
    bookName: 'Salmos',
    bookSlug: 'sl',
    chapter: 91,
    verse: 1,
    text: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.',
  },
  {
    id: 'jo-1-1',
    reference: 'João 1:1',
    bookName: 'João',
    bookSlug: 'joa',
    chapter: 1,
    verse: 1,
    text: 'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.',
  },
  {
    id: 'is-43-19',
    reference: 'Isaías 43:19',
    bookName: 'Isaías',
    bookSlug: 'is',
    chapter: 43,
    verse: 19,
    text: 'Eis que farei uma coisa nova, e agora sairá à luz; porventura não a sabereis? Eis que porei um caminho no deserto e rios no ermo.',
  },
];

/**
 * Normaliza string removendo acentos para comparação insensível
 */
export function normalizeSearchString(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Escapa caracteres especiais para uso seguro em RegExp
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verifica se um texto contém uma palavra exata delimitada por limites de palavra/pontuação
 */
export function hasExactWord(text: string | undefined | null, word: string): boolean {
  if (!text || !word) return false;
  const normText = normalizeSearchString(text);
  const normWord = normalizeSearchString(word);
  if (!normText || !normWord) return false;
  const regex = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normWord)}($|[^a-z0-9])`, 'i');
  return regex.test(normText);
}

/**
 * Calcula score de relevância ponderado para um marco de fé.
 * Garante que correspondências exatas (livro bíblico, referência, título, tags, palavras inteiras)
 * recebam prioridade absoluta sobre correspondências parciais/prefixos/substrings.
 */
export function calculateMemorialRelevance(entry: MemorialEntry, query: string): number {
  const normQuery = normalizeSearchString(query);
  if (!normQuery) return 1;

  let score = 0;
  const titleNorm = normalizeSearchString(entry.title || '');
  const contentNorm = normalizeSearchString(entry.content || '');
  const bookNameNorm = normalizeSearchString(entry.bible_ref?.book || '');
  const displayNorm = normalizeSearchString(entry.bible_ref?.display || '');
  const tagsNorm = (entry.tags || []).map(normalizeSearchString);
  const cleanQuery = normQuery.replace(/^#/, '');

  // 1. MATCH EXATO NO LIVRO BÍBLICO (Ex: "Jó", "Romanos", "Salmos")
  if (bookNameNorm === normQuery) {
    score += 5000;
  } else if (hasExactWord(bookNameNorm, normQuery)) {
    score += 3500;
  }

  // 2. MATCH EXATO NA REFERÊNCIA BÍBLICA (Ex: "Jó 15", "Rm 8:28")
  if (displayNorm.startsWith(normQuery + ' ') || displayNorm.startsWith(normQuery + ':')) {
    score += 3000;
  } else if (hasExactWord(displayNorm, normQuery)) {
    score += 2500;
  }

  // 3. MATCH EXATO NO TÍTULO
  if (titleNorm === normQuery) {
    score += 2000;
  } else if (titleNorm.startsWith(normQuery + ' ') || hasExactWord(titleNorm, normQuery)) {
    score += 1500;
  }

  // 4. MATCH EXATO EM TAGS
  if (tagsNorm.includes(cleanQuery)) {
    score += 1200;
  } else if (tagsNorm.some((t) => hasExactWord(t, cleanQuery))) {
    score += 1000;
  }

  // 5. MATCH EXATO DA PALAVRA NO CORPO DO RELATO (CONTEÚDO)
  if (hasExactWord(contentNorm, normQuery)) {
    score += 800;
    // Bônus proporcional a repetições da palavra exata
    const matches = contentNorm.match(new RegExp(`(^|[^a-z0-9])${escapeRegExp(normQuery)}($|[^a-z0-9])`, 'gi'));
    if (matches) {
      score += Math.min(matches.length * 40, 200);
    }
  }

  // 6. RECONHECIMENTO TEOLÓGICO-SEMÂNTICO E JEV
  // Mapeia temas espirituais universais com seus conceitos correlatos na teologia bíblica
  const BIBLICAL_SEMANTIC_MAP: Record<string, string[]> = {
    provisao: ['suprir', 'necessidade', 'riquezas', 'pao', 'sustento', 'fome', 'escassez', 'fidelidade', 'abundancia', 'azeite', 'viuva', 'maná'],
    paz: ['tranquilidade', 'aquietar', 'descanso', 'acalmar', 'vale', 'tempestade', 'consolo', 'refrigério', 'abrigo'],
    cura: ['enfermidade', 'restauraçao', 'saude', 'milagre', 'doença', 'medico', 'sarar', 'ferida', 'chaga'],
    direcao: ['caminho', 'decisao', 'lampada', 'guia', 'conselho', 'orientaçao', 'futuro', 'passos', 'porta', 'abrir'],
    fe: ['crer', 'confiança', 'esperança', 'certeza', 'firmeza', 'fidelidade', 'aliança', 'promessa', 'impossivel'],
    batalha: ['guerra', 'inimigo', 'combate', 'armadura', 'vitoria', 'gigante', 'derrota', 'fortaleza', 'escudo'],
    socorro: ['refugio', 'socorro', 'tribulaçao', 'angustia', 'clamor', 'livramento', 'prisao', 'correntes', 'socorrer'],
    graca: ['misericordia', 'favor', 'perdao', 'amor', 'cruz', 'salvaçao', 'redençao', 'justificaçao'],
    promessa: ['cumprimento', 'palavra', 'fiel', 'tempo', 'estaçao', 'espera', 'juramento', 'aliança'],
    gratidao: ['agradecimento', 'louvor', 'bencao', 'maravilha', 'grato', 'obrigado', 'acoes de gracas', 'celebracao', 'aleluia'],
  };

  // Se a busca corresponder a algum conceito temático teológico
  for (const [key, relatedWords] of Object.entries(BIBLICAL_SEMANTIC_MAP)) {
    if (normQuery.includes(key) || key.includes(normQuery)) {
      // Verifica se o marco contém essas palavras correlatas no conteúdo ou título
      for (const w of relatedWords) {
        if (hasExactWord(contentNorm, w) || hasExactWord(titleNorm, w)) {
          score += 350;
        }
      }
    }
  }

  // 7. MATCH EM CATEGORIA JEV (Jornada Ecos e Vínculos)
  if (entry.jev_category) {
    const jevNorm = normalizeSearchString(entry.jev_category.replace(/_/g, ' '));
    if (jevNorm.includes(cleanQuery) || hasExactWord(jevNorm, cleanQuery)) {
      score += 600;
    }
  }

  // 8. MATCH EXATO NAS CONEXÕES DE IA
  if (entry.ai_connections && entry.ai_connections.length > 0) {
    for (const c of entry.ai_connections) {
      if (hasExactWord(c.reference, normQuery)) {
        score += 450;
        break;
      }
      if (hasExactWord(c.verse_text, normQuery)) {
        score += 350;
        break;
      }
      if (c.explanation && hasExactWord(normalizeSearchString(c.explanation), normQuery)) {
        score += 250;
        break;
      }
      if (c.jev_category) {
        const catNorm = normalizeSearchString(c.jev_category.replace(/_/g, ' '));
        if (catNorm.includes(cleanQuery)) {
          score += 200;
          break;
        }
      }
    }
  }

  // 9. CORRESPONDÊNCIAS PARCIAIS (SUBSTRINGS) — PONTUAÇÃO RESIDUAL
  // Permite localizar outros termos semelhantes, mas sem nunca ultrapassar matches exatos
  if (titleNorm.includes(normQuery)) {
    score += 50;
  }
  if (displayNorm.includes(normQuery)) {
    score += 40;
  }
  if (tagsNorm.some((t) => t.includes(cleanQuery))) {
    score += 35;
  }
  if (contentNorm.includes(normQuery)) {
    score += 20;
  }
  if (
    entry.ai_connections?.some(
      (c) =>
        normalizeSearchString(c.reference).includes(normQuery) ||
        normalizeSearchString(c.verse_text).includes(normQuery)
    )
  ) {
    score += 15;
  }

  return score;
}

/**
 * Temas semânticos bíblicos sugeridos para descoberta rápida e sem atrito
 */
export const SUGGESTED_THEMES = [
  { id: 'paz', label: 'Paz' },
  { id: 'provisao', label: 'Provisão' },
  { id: 'cura', label: 'Cura' },
  { id: 'direcao', label: 'Direção' },
  { id: 'promessa', label: 'Promessa' },
  { id: 'gratidao', label: 'Gratidão' },
  { id: 'fe', label: 'Fé' },
  { id: 'socorro', label: 'Socorro' },
] as const;

/**
 * Busca nas memórias do Leitor com ordenação por relevância exata
 */
export function searchMemorialEntries(
  entries: MemorialEntry[],
  query: string,
  filterCategory?: string,
  filterOnlyAnswered?: boolean
): MemorialEntry[] {
  const normQuery = normalizeSearchString(query);

  const effectiveOnlyAnswered = filterOnlyAnswered || filterCategory === 'respondidas';
  const effectiveCategory = filterCategory === 'respondidas' ? undefined : filterCategory;

  // 1. Filtros prévios de categoria e orações respondidas
  const baseFiltered = entries.filter((entry) => {
    if (effectiveOnlyAnswered && (!entry.is_answered || entry.category !== 'oracao')) {
      return false;
    }

    if (effectiveCategory && effectiveCategory !== 'todos') {
      if (entry.category !== effectiveCategory) return false;
    }

    return true;
  });

  // Se não houver termo de busca, mantém ordenação cronológica decrescente
  if (!normQuery) {
    return baseFiltered;
  }

  // 2. Pontua e filtra por score > 0
  const scored = baseFiltered
    .map((entry) => ({
      entry,
      score: calculateMemorialRelevance(entry, query),
    }))
    .filter((item) => item.score > 0);

  // 3. Ordenação: Maior relevância primeiro; desempate por mais recente
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.entry.created_at).getTime() - new Date(a.entry.created_at).getTime();
  });

  return scored.map((item) => item.entry);
}

/**
 * Decodifica padrões frequentes de mojibake (Latin1/UTF-8 duplo encoding)
 * retornados pelo banco D1 do Cloudflare Worker
 */
export function sanitizeBibleText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/justiA\s?a/gi, 'justiça')
    .replace(/justiA§a/gi, 'justiça')
    .replace(/fAc/gi, 'fé')
    .replace(/estA[^\s\w]?/gi, 'está')
    .replace(/serA[^\s\w]?/gi, 'será')
    .replace(/viverA[^\s\w]?/gi, 'viverá')
    .replace(/darA[^\s\w]?/gi, 'dará')
    .replace(/alguAcm/gi, 'alguém')
    .replace(/ninguAcm/gi, 'ninguém')
    .replace(/vocA[^\s\w]?/gi, 'você')
    .replace(/dAccimo/gi, 'décimo')
    .replace(/mA[^\s\w]?s/gi, 'mês')
    .replace(/trA[^\s\w]?s/gi, 'três')
    .replace(/comeA\s?a/gi, 'começa')
    .replace(/abenA\s?o/gi, 'abenço')
    .replace(/pA[^\s\w]?es/gi, 'pães')
    .replace(/A[^\s\w]?zimos/gi, 'ázimos')
    .replace(/determinaA\s?A[^\s\w]?es/gi, 'determinações')
    .replace(/bA[^\s\w]?n/gi, 'bên')
    .replace(/intermAcdio/gi, 'intermédio')
    .replace(/consciA[^\s\w]?ncia/gi, 'consciência')
    .replace(/naufrA[^\s\w]?gio/gi, 'naufrágio')
    .replace(/coracA\s?o/gi, 'coração')
    .replace(/coraA\s?A[^\s\w]?es/gi, 'corações')
    .replace(/graA\s?a/gi, 'graça')
    .replace(/bA[^\s\w]?n/gi, 'bên')
    .replace(/glA3ria/gi, 'glória')
    .replace(/misericA3rdia/gi, 'misericórdia')
    .replace(/prA3ximo/gi, 'próximo')
    .replace(/sA[^\s\w]?o/gi, 'são')
    .replace(/nA[^\s\w]?o/gi, 'não')
    .replace(/entA[^\s\w]?o/gi, 'então')
    .replace(/irmA[^\s\w]?os/gi, 'irmãos')
    .replace(/irmA[^\s\w]?o/gi, 'irmão')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface BibleSearchResponseData {
  results: BibleSearchResult[];
  total: number;
}

/**
 * Busca nas Escrituras (Bíblia Vive API / Worker com busca exata, paginação e fallback local)
 */
export async function searchBibleVerses(
  query: string,
  offset = 0,
  limit = 50,
  signal?: AbortSignal
): Promise<BibleSearchResponseData> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], total: 0 };

  const normQuery = normalizeSearchString(trimmed);

  // Se a query não contiver aspas e for uma palavra ou frase,
  // envolvemos entre aspas para que o FTS5 da Cloudflare busque
  // a palavra EXATA (ex: "fé") em vez do curinga prefixo ("fe"* que traz feriu, festa, etc.)
  const formattedQuery = trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed
    : `"${trimmed}"`;

  // 1. Tenta consultar a API de busca da Bíblia Vive na borda (Cloudflare Worker FTS5 com v=acf para a versão oficial)
  try {
    const url = `https://busca.bibliavive.com.br?q=${encodeURIComponent(formattedQuery)}&v=acf&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.verses)) {
        const seenPassages = new Set<string>();
        const results: BibleSearchResult[] = [];

        for (const v of data.verses) {
          const passageKey = `${(v.bookId || 'sl').toLowerCase()}.${v.chapter}.${v.verse}`;
          if (seenPassages.has(passageKey)) continue;
          seenPassages.add(passageKey);

          const cleanedText = sanitizeBibleText(v.text || '');
          const cleanRef = sanitizeBibleText(v.reference || `${v.bookName} ${v.chapter}:${v.verse}`);
          const cleanBookName = sanitizeBibleText(v.bookName || v.bookId);

          const resolvedSlug = normalizeBookSlug(v.bookId || v.bookName || 'sl');

          results.push({
            id: `${v.bookId}-${v.chapter}-${v.verse}-${offset + results.length}`,
            reference: cleanRef,
            bookName: cleanBookName,
            bookSlug: resolvedSlug,
            chapter: v.chapter || 1,
            verse: v.verse || 1,
            text: cleanedText,
          });
        }

        return {
          results,
          total: data.total || results.length,
        };
      }
    }
  } catch (err: any) {
    if (
      err?.name === 'AbortError' ||
      err?.message?.includes('canceled') ||
      err?.message?.includes('aborted')
    ) {
      return { results: [], total: 0 };
    }
    console.warn('[Memorial Search] Falha ao consultar endpoint online, usando busca local:', err?.message || err);
  }

  // 2. Fallback offline: busca nos versículos em memória
  const localMatches = LOCAL_BIBLE_VERSES.filter((v) => {
    return (
      normalizeSearchString(v.text).includes(normQuery) ||
      normalizeSearchString(v.reference).includes(normQuery) ||
      normalizeSearchString(v.bookName).includes(normQuery)
    );
  });

  return {
    results: localMatches,
    total: localMatches.length,
  };
}

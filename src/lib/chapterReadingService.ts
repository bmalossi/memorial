/**
 * chapterReadingService.ts — Bíblia Vive / Memorial
 *
 * Serviço de registro e sincronização de capítulos lidos da Bíblia.
 * 100% alinhado com a arquitetura de leitura do Bíblia Vive (chapter_views):
 * - Persistência imediata local no AsyncStorage (@memorial:chapter_views:<slug>)
 * - Sincronização em nuvem segura via Supabase (tabela chapter_views)
 * - Mapeamento canônico bidirecional entre slugs móveis (sl, gn, mt) e IDs bíblicos (psa, gen, mat)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const STORAGE_PREFIX = '@memorial:chapter_views:';

/**
 * Mapeamento canônico entre slugs de livros (usados no Memorial)
 * e IDs universais da tabela chapter_views do Bíblia Vive.
 */
export const SLUG_TO_BOOK_ID: Record<string, string> = {
  gn: 'gen',
  ex: 'exo',
  lv: 'lev',
  nm: 'num',
  dt: 'deu',
  js: 'jos',
  jz: 'jdg',
  rt: 'rut',
  '1sm': 'sa1',
  '2sm': 'sa2',
  '1rs': 'kg1',
  '2rs': 'kg2',
  '1cr': 'ch1',
  '2cr': 'ch2',
  ed: 'ezr',
  ne: 'neh',
  et: 'est',
  jo: 'job',
  sl: 'psa',
  pv: 'pro',
  ec: 'ecc',
  ct: 'sol',
  is: 'isa',
  jr: 'jer',
  lm: 'lam',
  ez: 'eze',
  dn: 'dan',
  os: 'hos',
  jl: 'joe',
  am: 'amo',
  ob: 'oba',
  jn: 'jon',
  mq: 'mic',
  na: 'nah',
  hc: 'hab',
  sf: 'zep',
  ag: 'hag',
  zc: 'zac',
  ml: 'mal',
  mt: 'mat',
  mc: 'mar',
  lc: 'luk',
  joa: 'joh',
  atos: 'act',
  rm: 'rom',
  '1co': 'co1',
  '2co': 'co2',
  gl: 'gal',
  ef: 'eph',
  fp: 'phi',
  cl: 'col',
  '1ts': 'th1',
  '2ts': 'th2',
  '1tm': 'ti1',
  '2tm': 'ti2',
  tt: 'tit',
  fm: 'plm',
  hb: 'heb',
  tg: 'jam',
  '1pe': 'pe1',
  '2pe': 'pe2',
  '1jo': 'jo1',
  '2jo': 'jo2',
  '3jo': 'jo3',
  jd: 'jde',
  ap: 'rev',
};

export const BOOK_ID_TO_SLUG: Record<string, string> = Object.entries(
  SLUG_TO_BOOK_ID
).reduce((acc, [slug, id]) => {
  acc[id] = slug;
  return acc;
}, {} as Record<string, string>);

export function getBookIdFromSlug(slug: string): string {
  const norm = slug.toLowerCase().trim();
  return SLUG_TO_BOOK_ID[norm] || norm;
}

export function getSlugFromBookId(bookId: string): string {
  const norm = bookId.toLowerCase().trim();
  return BOOK_ID_TO_SLUG[norm] || norm;
}

function getStorageKey(bookSlug: string): string {
  return `${STORAGE_PREFIX}${bookSlug.toLowerCase().trim()}`;
}

export interface ChapterViewRecord {
  [chapter: number]: string; // ISO date string da última leitura
}

/**
 * Lê o mapa de capítulos lidos localmente no AsyncStorage para um livro.
 */
export async function getLocalChapterViews(bookSlug: string): Promise<ChapterViewRecord> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(bookSlug));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Salva o mapa de capítulos lidos localmente no AsyncStorage para um livro.
 */
export async function setLocalChapterViews(
  bookSlug: string,
  views: ChapterViewRecord
): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKey(bookSlug), JSON.stringify(views));
  } catch {}
}

/**
 * Registra a leitura de um capítulo da Bíblia.
 * Salva instantaneamente no AsyncStorage (0ms) e, se autenticado, sincroniza com Supabase.
 */
export async function recordChapterView(
  bookSlug: string,
  chapter: number,
  viewedAt: Date = new Date()
): Promise<void> {
  if (!bookSlug || chapter < 1) return;

  const slug = bookSlug.toLowerCase().trim();
  const isoDate = viewedAt.toISOString();

  // 1. Atualização imediata no cache local (AsyncStorage)
  const currentViews = await getLocalChapterViews(slug);
  currentViews[chapter] = isoDate;
  await setLocalChapterViews(slug, currentViews);

  // 2. Sincronização remota via Supabase se o usuário estiver autenticado
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const bookId = getBookIdFromSlug(slug);
      await supabase.from('chapter_views').upsert(
        {
          user_id: userId,
          book_id: bookId,
          chapter,
          viewed_at: isoDate,
        },
        { onConflict: 'user_id,book_id,chapter' }
      );
    }
  } catch {
    // Falhas de rede ou offline não interrompem a experiência local do Leitor
  }
}

/**
 * Retorna os números dos capítulos lidos para determinado livro.
 * Prioriza leitura local instantânea e mescla com nuvem em background.
 */
export async function getVisitedChaptersForBook(bookSlug: string): Promise<number[]> {
  if (!bookSlug) return [];

  const slug = bookSlug.toLowerCase().trim();
  const localMap = await getLocalChapterViews(slug);

  // Busca remota complementar se conectado
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const bookId = getBookIdFromSlug(slug);
      const { data, error } = await supabase
        .from('chapter_views')
        .select('chapter, viewed_at')
        .eq('user_id', userId)
        .in('book_id', [bookId, slug]);

      if (!error && Array.isArray(data) && data.length > 0) {
        let changed = false;
        for (const row of data) {
          const ch = Number(row.chapter);
          if (ch > 0 && (!localMap[ch] || new Date(row.viewed_at) > new Date(localMap[ch]))) {
            localMap[ch] = row.viewed_at;
            changed = true;
          }
        }
        if (changed) {
          await setLocalChapterViews(slug, localMap);
        }
      }
    }
  } catch {}

  return Object.keys(localMap)
    .map((k) => Number(k))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
}

/**
 * Verifica rapidamente se um capítulo específico já foi lido.
 */
export async function isChapterVisited(bookSlug: string, chapter: number): Promise<boolean> {
  const chapters = await getVisitedChaptersForBook(bookSlug);
  return chapters.includes(chapter);
}

/**
 * Helper para testes: limpa todos os registros de capítulos lidos.
 */
export async function clearChapterViewsForTesting(slugs: string[] = ['sl', 'gn', 'ex']): Promise<void> {
  for (const s of slugs) {
    try {
      await AsyncStorage.removeItem(getStorageKey(s));
    } catch {}
  }
}

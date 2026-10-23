/**
 * chapterNotebookAdapter.ts — Memorial
 *
 * Busca os registros da tabela `chapter_notebooks` do Supabase (escritos
 * via botão Caderno do Capítulo no site Bíblia Vive) e os converte para
 * o modelo MemorialEntry, tornando-os visíveis na Linha Sagrada do app.
 *
 * Regras de mapeamento:
 *  - category: 'reflexao' (tipo mais próximo semanticamente)
 *  - tag: 'caderno' (identifica a origem para UI futura)
 *  - bible_ref: construída a partir de book_id + chapter
 *  - id: prefixado com 'nb_' para evitar colisão com user_notes UUIDs
 *    (não são iguais — Supabase pode gerar UUIDs idênticos em tabelas separadas)
 */

import { supabase } from './supabase';
import { MemorialEntry, BibleRef } from './types';
import { normalizeBookSlug, findBook } from './bibleData';

/** Converte um slug de livro no nome em PT-BR canônico */
function resolveBookName(bookId: string): string {
  const norm = normalizeBookSlug(bookId);
  const book = findBook(norm);
  return book?.name ?? bookId.toUpperCase();
}

/** Monta a BibleRef a partir dos campos do chapter_notebooks */
function buildBibleRef(bookId: string, chapter: number): BibleRef | undefined {
  if (!bookId || !chapter || chapter === 0) return undefined;
  const slug = normalizeBookSlug(bookId);
  const bookName = resolveBookName(bookId);
  return {
    book: bookName,
    slug,
    chapter,
    display: `${bookName} ${chapter}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChapterNotebookRow(row: any): MemorialEntry {
  const bookId: string = row.book_id ?? 'geral';
  const chapter: number = Number(row.chapter) || 0;

  return {
    // Prefixo 'nb_' distingue IDs de chapter_notebooks de user_notes
    id: `nb_${row.id}`,
    category: 'reflexao',
    title: row.title || undefined,
    content: row.content || '',
    bible_ref: chapter > 0 ? buildBibleRef(bookId, chapter) : undefined,
    tags: ['caderno'],
    ai_status: 'none',
    ai_connections: undefined,
    is_answered: false,
    created_at: row.created_at || new Date().toISOString(),
    sync_status: 'synced',
  };
}

/**
 * Busca todos os chapter_notebooks do usuário autenticado e converte para MemorialEntry[].
 * Retorna array vazio em caso de erro — nunca lança.
 */
export async function fetchChapterNotebooks(userId: string): Promise<MemorialEntry[]> {
  try {
    const { data, error } = await supabase
      .from('chapter_notebooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Falha silenciosa — não bloqueia a sync principal
      return [];
    }

    return (data ?? []).map(mapChapterNotebookRow);
  } catch {
    return [];
  }
}

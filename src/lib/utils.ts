import { MemorialCategory } from './supabase';

export interface CategoryInfo {
  label: string;
  tag:   string;
}

export const CATEGORY_CONFIG: Record<MemorialCategory, CategoryInfo> = {
  reflexao: {
    label: 'Reflexão',
    tag:   'REFLEXÃO',
  },
  oracao: {
    label: 'Oração',
    tag:   'ORAÇÃO',
  },
  testemunho: {
    label: 'Testemunho',
    tag:   'TESTEMUNHO',
  },
  jejum: {
    label: 'Jejum',
    tag:   'JEJUM',
  },
};

export function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (mins  < 1)    return 'agora';
  if (mins  < 60)   return `${mins}m`;
  if (hours < 24)   return `${hours}h`;
  if (days  === 1)  return 'ontem';
  if (days  < 7)    return `${days}d`;
  if (weeks === 1)  return '1 semana';
  if (weeks < 5)    return `${weeks} sem`;
  if (months === 1) return '1 mês';
  return `${months} meses`;
}

export function truncate(text: string, maxLen = 140): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Gera um título automático e solene para uma memória rápida a partir das primeiras palavras e da data.
 * Evita cortes abruptos de palavras e mantém o padrão reverente do diário espiritual.
 */
export function generateAutoTitle(content: string, date: Date = new Date()): string {
  const clean = (content || '').replace(/\s+/g, ' ').trim();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dateStr = `${day}/${month}`;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (!clean) {
    return `Memória · ${dateStr} às ${timeStr}`;
  }

  // Captura até as primeiras 5 palavras ou cerca de 28 caracteres
  const words = clean.split(' ').filter(Boolean);
  const selectedWords: string[] = [];
  let charCount = 0;

  for (const word of words) {
    if (selectedWords.length >= 5 || (charCount + word.length > 28 && selectedWords.length >= 2)) {
      break;
    }
    selectedWords.push(word);
    charCount += word.length + 1;
  }

  const baseTitle = selectedWords.join(' ').replace(/[,;:.!?]+$/, '');
  const hasMore = words.length > selectedWords.length;
  const prefix = hasMore ? `${baseTitle}…` : baseTitle;

  return `${prefix} · ${dateStr}`;
}

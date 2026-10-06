export type MemorialCategory = 'reflexao' | 'oracao' | 'testemunho' | 'jejum';

export interface BibleRef {
  book:    string;   // "Salmos"
  slug:    string;   // "sl"
  chapter: number;   // 23
  verse?:  number;   // 1 (opcional)
  display: string;   // "Salmos 23:1"
}

export type JevCategory =
  | 'Cumprimento_Profetico'
  | 'Eco_de_Linguagem'
  | 'Contraste_de_Alianca'
  | 'Resposta_de_Oracao';

export const JEV_CONFIG: Record<
  JevCategory,
  { label: string; tag: string; description: string; icon: string }
> = {
  Cumprimento_Profetico: {
    label: 'Cumprimento Profético',
    tag: 'PROFÉTICO',
    description: 'Tipo e antítipo, prefiguração e cumprimento na aliança',
    icon: 'compass',
  },
  Eco_de_Linguagem: {
    label: 'Eco de Linguagem',
    tag: 'RESSONÂNCIA',
    description: 'Ressonância temática de termos e imagens bíblicas',
    icon: 'repeat',
  },
  Contraste_de_Alianca: {
    label: 'Contraste de Aliança',
    tag: 'ALIANÇA',
    description: 'Distinção reveladora entre Antiga e Nova Aliança, Lei e Graça',
    icon: 'layers',
  },
  Resposta_de_Oracao: {
    label: 'Resposta de Oração',
    tag: 'PROVIDÊNCIA',
    description: 'Evidência bíblica da providência e fidelidade divina',
    icon: 'check-circle',
  },
};

export interface AiConnection {
  reference:     string;
  verse_text:    string;
  explanation:   string;
  book_slug:     string;
  chapter:       number;
  verse:         number;
  jev_category?: JevCategory;
  confidence?:   number;
}

export type SyncStatus = 'synced' | 'pending' | 'local_only' | 'syncing' | 'error';

export type PastoralIntent =
  | 'CRISIS'
  | 'THEOLOGICAL_QUERY'
  | 'THANKSGIVING'
  | 'ANSWERED_PRAYER';

export interface MemorialEntry {
  id:              string;
  category:        MemorialCategory;
  title?:          string;
  content:         string;
  bible_ref?:      BibleRef;
  tags?:           string[];
  ai_connections?: AiConnection[];
  ai_status:       'none' | 'processing' | 'done';
  jev_category?:   JevCategory;
  is_answered?:    boolean;   // para Orações
  answered_at?:    string;
  pastoral_intent?: PastoralIntent | null;
  pastoral_intent_confidence?: number | null;
  pastoral_intent_evaluated_at?: string | null;
  pastoral_intent_reason?: string | null;
  pastoral_alert_sent_types?: string[];
  created_at:      string;    // ISO string
  sync_status?:    SyncStatus;
}


// ─── Dados de exemplo (mock) para desenvolvimento ────────────────────────────
export const MOCK_ENTRIES: MemorialEntry[] = [
  {
    id: '1',
    category: 'testemunho',
    title: 'A tempestade passou',
    content:
      'A tempestade passou. Tu supriste cada detalhe da nossa casa. Não faltou nada — nem a conta de água, nem a alegria das crianças. A fidelidade de Deus é real e visível.',
    bible_ref: {
      book: 'Salmos', slug: 'sl', chapter: 23, verse: 1,
      display: 'Salmos 23:1',
    },
    tags: ['providência', 'família'],
    ai_status: 'done',
    ai_connections: [
      {
        reference: 'Filipenses 4:19',
        verse_text: 'O meu Deus, segundo as suas riquezas em glória, suprirá todas as vossas necessidades em Cristo Jesus.',
        explanation: 'A provisão sobrenatural que você vivenciou é exatamente o que Paulo descreve: Deus suprindo segundo suas riquezas.',
        book_slug: 'fp', chapter: 4, verse: 19,
      },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 12).toISOString(),
  },
  {
    id: '2',
    category: 'oracao',
    title: 'Pedido de paz para a nova etapa',
    content:
      'Pedindo paz para a decisão da nova etapa da família. Senhor, que tua vontade seja feita e que possamos caminhar sem medo para onde Tu nos chamas.',
    bible_ref: {
      book: 'Filipenses', slug: 'fp', chapter: 4, verse: 6,
      display: 'Filipenses 4:6-7',
    },
    tags: ['família', 'decisão'],
    ai_status: 'done',
    is_answered: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: '3',
    category: 'reflexao',
    title: 'O rei se pôs em pé junto à coluna',
    content:
      'O rei se pôs em pé junto à coluna e fez a aliança diante do Senhor. Que impacto — um líder se humilhando publicamente. Qual coluna eu tenho me colocado diante de Deus?',
    bible_ref: {
      book: '2 Reis', slug: '2rs', chapter: 23, verse: 3,
      display: '2 Reis 23:3',
    },
    ai_status: 'processing',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: '4',
    category: 'jejum',
    title: 'Jejum de Daniel — 21 dias',
    content:
      'Iniciando 21 dias de jejum de Daniel em busca de direção para o ministério. Só legumes, frutas e água. Que Deus abra os céus e fale.',
    ai_status: 'none',
    is_answered: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: '5',
    category: 'testemunho',
    title: 'Palavra confirmada no culto',
    content:
      'Na semana passada eu havia lido Isaías 43:19 e sentido que Deus estava me dizendo algo novo. Hoje o pastor pregou exatamente esse versículo. Confirmação!',
    bible_ref: {
      book: 'Isaías', slug: 'is', chapter: 43, verse: 19,
      display: 'Isaías 43:19',
    },
    tags: ['confirmação', 'palavra'],
    ai_status: 'done',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

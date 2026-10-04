import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase compartilhado com o bibliavive.com.br
 *
 * Crie um arquivo .env na raiz do projeto com:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 * As credenciais estão no projeto Bíblia Vive (.env ou painel Supabase).
 */

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Guarda contra crash em desenvolvimento sem .env configurado
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage:           AsyncStorage,
      autoRefreshToken:  true,
      persistSession:    true,
      detectSessionInUrl: false,
    },
  });
} else {
  // Mock client para desenvolvimento sem credenciais
  // Substitua pelo cliente real ao adicionar o .env
  console.warn(
    '[Memorial] Supabase não configurado. ' +
    'Crie um arquivo .env com EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
  // @ts-ignore — cliente placeholder para não crashar em dev
  supabase = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: new Error('Supabase não configurado') }),
      signOut: async () => {},
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
  } as unknown as SupabaseClient;
}

export { supabase };

// ─── Tipos do banco de dados ─────────────────────────────────────────────────
export type MemorialCategory = 'reflexao' | 'oracao' | 'testemunho' | 'jejum';

export interface BibleConnection {
  reference:    string;   // ex: "Salmos 23:1"
  verse_text:   string;   // texto do versículo
  explanation:  string;   // como se conecta ao registro
  book_slug:    string;   // ex: "sl"
  chapter:      number;
  verse:        number;
}

export interface AiAnalysis {
  connections:   BibleConnection[];
  summary?:      string;
  analyzed_at:   string;
  model_version: string;
}

export interface MemorialEntryDB {
  id:           string;
  user_id:      string;
  category:     MemorialCategory;
  content:      string;
  title?:       string;
  bible_ref?:   string;
  tags?:        string[];
  ai_analysis?: AiAnalysis;
  is_answered?: boolean;
  answered_at?: string;
  created_at:   string;
  updated_at:   string;
}

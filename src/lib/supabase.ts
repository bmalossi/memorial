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

const DEFAULT_SUPABASE_URL = 'https://yqnsaslvxmqaeeccmcmg.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbnNhc2x2eG1xYWVlY2NtY21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDk0NzIsImV4cCI6MjA5MDAyNTQ3Mn0.CLj0G4_2TWy1TSoUDkg_vC5ZPIB6DxGeXepwKRo73gE';

const supabaseUrl =
  (process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_URL.trim().length > 0)
    ? process.env.EXPO_PUBLIC_SUPABASE_URL
    : DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim().length > 0)
    ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    : DEFAULT_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

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
  corinthians_15_resurrection: {
    reference: "1 Coríntios 15:35-58",
    book_name: "1 Coríntios",
    book_slug: "1co",
    chapter: 15,
    start_verse: 35,
    end_verse: 58,
    github_id: "1co",
  },
  thessalonians_4_resurrection: {
    reference: "1 Tessalonicenses 4:13-18",
    book_name: "1 Tessalonicenses",
    book_slug: "1ts",
    chapter: 4,
    start_verse: 13,
    end_verse: 18,
    github_id: "1ts",
  },
  genesis_1_creation: {
    reference: "Gênesis 1:1-31",
    book_name: "Gênesis",
    book_slug: "gn",
    chapter: 1,
    start_verse: 1,
    end_verse: 31,
    github_id: "gn",
  },
  genesis_3_fall: {
    reference: "Gênesis 3:1-19",
    book_name: "Gênesis",
    book_slug: "gn",
    chapter: 3,
    start_verse: 1,
    end_verse: 19,
    github_id: "gn",
  },
  genesis_6_noah: {
    reference: "Gênesis 6:9-22",
    book_name: "Gênesis",
    book_slug: "gn",
    chapter: 6,
    start_verse: 9,
    end_verse: 22,
    github_id: "gn",
  },
  genesis_22_abraham_isaac: {
    reference: "Gênesis 22:1-14",
    book_name: "Gênesis",
    book_slug: "gn",
    chapter: 22,
    start_verse: 1,
    end_verse: 14,
    github_id: "gn",
  },
  exodus_14_red_sea: {
    reference: "Êxodo 14:13-31",
    book_name: "Êxodo",
    book_slug: "ex",
    chapter: 14,
    start_verse: 13,
    end_verse: 31,
    github_id: "ex",
  },
  exodus_20_commandments: {
    reference: "Êxodo 20:1-17",
    book_name: "Êxodo",
    book_slug: "ex",
    chapter: 20,
    start_verse: 1,
    end_verse: 17,
    github_id: "ex",
  },
  1samuel_17_david_goliath: {
    reference: "1 Samuel 17:38-51",
    book_name: "1 Samuel",
    book_slug: "1sm",
    chapter: 17,
    start_verse: 38,
    end_verse: 51,
    github_id: "1sm",
  },
  psalm_1_blessed_man: {
    reference: "Salmos 1:1-6",
    book_name: "Salmos",
    book_slug: "sl",
    chapter: 1,
    start_verse: 1,
    end_verse: 6,
    github_id: "ps",
  },
  psalm_51_repentance: {
    reference: "Salmos 51:1-12",
    book_name: "Salmos",
    book_slug: "sl",
    chapter: 51,
    start_verse: 1,
    end_verse: 12,
    github_id: "ps",
  },
  psalm_121_help: {
    reference: "Salmos 121:1-8",
    book_name: "Salmos",
    book_slug: "sl",
    chapter: 121,
    start_verse: 1,
    end_verse: 8,
    github_id: "ps",
  },
  psalm_139_omnipresence: {
    reference: "Salmos 139:1-18",
    book_name: "Salmos",
    book_slug: "sl",
    chapter: 139,
    start_verse: 1,
    end_verse: 18,
    github_id: "ps",
  },
  proverbs_3_trust: {
    reference: "Provérbios 3:5-12",
    book_name: "Provérbios",
    book_slug: "pv",
    chapter: 3,
    start_verse: 5,
    end_verse: 12,
    github_id: "prv",
  },
  ecclesiastes_3_time_season: {
    reference: "Eclesiastes 3:1-8",
    book_name: "Eclesiastes",
    book_slug: "ec",
    chapter: 3,
    start_verse: 1,
    end_verse: 8,
    github_id: "ec",
  },
  isaiah_9_unto_us_child: {
    reference: "Isaías 9:6-7",
    book_name: "Isaías",
    book_slug: "is",
    chapter: 9,
    start_verse: 6,
    end_verse: 7,
    github_id: "is",
  },
  daniel_6_lions_den: {
    reference: "Daniel 6:10-23",
    book_name: "Daniel",
    book_slug: "dn",
    chapter: 6,
    start_verse: 10,
    end_verse: 23,
    github_id: "dn",
  },
  matthew_7_ask_seek_knock: {
    reference: "Mateus 7:7-12",
    book_name: "Mateus",
    book_slug: "mt",
    chapter: 7,
    start_verse: 7,
    end_verse: 12,
    github_id: "mt",
  },
  matthew_11_weary_rest: {
    reference: "Mateus 11:28-30",
    book_name: "Mateus",
    book_slug: "mt",
    chapter: 11,
    start_verse: 28,
    end_verse: 30,
    github_id: "mt",
  },
  matthew_25_sheep_goats: {
    reference: "Mateus 25:31-46",
    book_name: "Mateus",
    book_slug: "mt",
    chapter: 25,
    start_verse: 31,
    end_verse: 46,
    github_id: "mt",
  },
  matthew_28_great_commission: {
    reference: "Mateus 28:16-20",
    book_name: "Mateus",
    book_slug: "mt",
    chapter: 28,
    start_verse: 16,
    end_verse: 20,
    github_id: "mt",
  },
  luke_2_nativity: {
    reference: "Lucas 2:1-20",
    book_name: "Lucas",
    book_slug: "lc",
    chapter: 2,
    start_verse: 1,
    end_verse: 20,
    github_id: "lk",
  },
  luke_10_good_samaritan: {
    reference: "Lucas 10:25-37",
    book_name: "Lucas",
    book_slug: "lc",
    chapter: 10,
    start_verse: 25,
    end_verse: 37,
    github_id: "lk",
  },
  luke_15_prodigal_son: {
    reference: "Lucas 15:11-32",
    book_name: "Lucas",
    book_slug: "lc",
    chapter: 15,
    start_verse: 11,
    end_verse: 32,
    github_id: "lk",
  },
  john_3_born_again: {
    reference: "João 3:1-21",
    book_name: "João",
    book_slug: "joa",
    chapter: 3,
    start_verse: 1,
    end_verse: 21,
    github_id: "jo",
  },
  john_4_samaritan_woman: {
    reference: "João 4:7-26",
    book_name: "João",
    book_slug: "joa",
    chapter: 4,
    start_verse: 7,
    end_verse: 26,
    github_id: "jo",
  },
  john_10_good_shepherd: {
    reference: "João 10:1-18",
    book_name: "João",
    book_slug: "joa",
    chapter: 10,
    start_verse: 1,
    end_verse: 18,
    github_id: "jo",
  },
  john_14_way_truth_life: {
    reference: "João 14:1-14",
    book_name: "João",
    book_slug: "joa",
    chapter: 14,
    start_verse: 1,
    end_verse: 14,
    github_id: "jo",
  },
  john_15_true_vine: {
    reference: "João 15:1-11",
    book_name: "João",
    book_slug: "joa",
    chapter: 15,
    start_verse: 1,
    end_verse: 11,
    github_id: "jo",
  },
  acts_2_pentecost: {
    reference: "Atos 2:1-13",
    book_name: "Atos",
    book_slug: "at",
    chapter: 2,
    start_verse: 1,
    end_verse: 13,
    github_id: "act",
  },
  romans_12_living_sacrifice: {
    reference: "Romanos 12:1-21",
    book_name: "Romanos",
    book_slug: "rm",
    chapter: 12,
    start_verse: 1,
    end_verse: 21,
    github_id: "rm",
  },
  galatians_5_fruit_spirit: {
    reference: "Gálatas 5:16-26",
    book_name: "Gálatas",
    book_slug: "gl",
    chapter: 5,
    start_verse: 16,
    end_verse: 26,
    github_id: "gl",
  },
  colossians_3_new_man: {
    reference: "Colossenses 3:1-17",
    book_name: "Colossenses",
    book_slug: "cl",
    chapter: 3,
    start_verse: 1,
    end_verse: 17,
    github_id: "cl",
  },
  hebrews_11_faith: {
    reference: "Hebreus 11:1-16",
    book_name: "Hebreus",
    book_slug: "hb",
    chapter: 11,
    start_verse: 1,
    end_verse: 16,
    github_id: "hb",
  },
  hebrews_12_cloud_witnesses: {
    reference: "Hebreus 12:1-3",
    book_name: "Hebreus",
    book_slug: "hb",
    chapter: 12,
    start_verse: 1,
    end_verse: 3,
    github_id: "hb",
  },
  james_1_wisdom_trials: {
    reference: "Tiago 1:2-12",
    book_name: "Tiago",
    book_slug: "tg",
    chapter: 1,
    start_verse: 2,
    end_verse: 12,
    github_id: "jm",
  },
  james_2_faith_works: {
    reference: "Tiago 2:14-26",
    book_name: "Tiago",
    book_slug: "tg",
    chapter: 2,
    start_verse: 14,
    end_verse: 26,
    github_id: "jm",
  },
  2timothy_3_scripture: {
    reference: "2 Timóteo 3:14-17",
    book_name: "2 Timóteo",
    book_slug: "2tm",
    chapter: 3,
    start_verse: 14,
    end_verse: 17,
    github_id: "2tm",
  },
  1john_4_god_is_love: {
    reference: "1 João 4:7-21",
    book_name: "1 João",
    book_slug: "1jo",
    chapter: 4,
    start_verse: 7,
    end_verse: 21,
    github_id: "1jo",
  },
  revelation_21_new_jerusalem: {
    reference: "Apocalipse 21:1-8",
    book_name: "Apocalipse",
    book_slug: "ap",
    chapter: 21,
    start_verse: 1,
    end_verse: 8,
    github_id: "re",
  },
  malachi_3_tithes: {
    reference: "Malaquias 3:8-12",
    book_name: "Malaquias",
    book_slug: "ml",
    chapter: 3,
    start_verse: 8,
    end_verse: 12,
    github_id: "ml",
  },
  joshua_1_courage: {
    reference: "Josué 1:1-9",
    book_name: "Josué",
    book_slug: "js",
    chapter: 1,
    start_verse: 1,
    end_verse: 9,
    github_id: "js",
  },
  micah_6_justice_mercy: {
    reference: "Miqueias 6:6-8",
    book_name: "Miqueias",
    book_slug: "mq",
    chapter: 6,
    start_verse: 6,
    end_verse: 8,
    github_id: "mi",
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
  corinthians_15_resurrection: {
    what: "A ressurreição dos mortos, a transformação do corpo natural e mortal em corpo espiritual e incorruptível no fim dos tempos e a vitória final em 1 Coríntios 15:35-58",
    examples: [
      "corpos ressuscitados no fim dos tempos",
      "onde fala sobre corpos ressuscitados",
      "como ressuscitarão os mortos e com que corpo virão",
      "semeia-se corpo natural ressuscitará corpo espiritual",
      "a última trombeta tocará e os mortos ressuscitarão incorruptíveis",
      "tragada foi a morte na vitória",
    ],
  },
  thessalonians_4_resurrection: {
    what: "A esperança sobre os que dormem, o arrebatamento e a ressurreição dos mortos em Cristo quando o Senhor descer do céu em 1 Tessalonicenses 4:13-18",
    examples: [
      "os mortos em Cristo ressuscitarão primeiro",
      "os que dormem em Jesus",
      "o arrebatamento da igreja",
      "o Senhor mesmo descerá do céu com alarido",
    ],
  },
  genesis_1_creation: {
    what: "A criação dos céus, da terra e do ser humano à imagem e semelhança de Deus em Gênesis 1:1-31",
    examples: [
      "no princípio criou Deus os céus e a terra",
      "a criação do mundo e do homem",
      "haja luz",
      "façamos o homem à nossa imagem",
    ],
  },
  genesis_3_fall: {
    what: "A tentação da serpente, a queda do homem no pecado e a primeira promessa de redenção em Gênesis 3:1-19",
    examples: [
      "a queda do homem",
      "o fruto proibido e o pecado de Adão e Eva",
      "a serpente enganou Eva",
      "do pó és e ao pó tornarás",
    ],
  },
  genesis_6_noah: {
    what: "A história de Noé, a arca da salvação e o dilúvio sobre a terra corrompida em Gênesis 6:9-22",
    examples: [
      "Noé e a arca",
      "o dilúvio universal",
      "construção da arca de Noé",
    ],
  },
  genesis_22_abraham_isaac: {
    what: "A prova de fé de Abraão oferecendo Isaque em sacrifício no monte Moriá e a provisão do Cordeiro em Gênesis 22:1-14",
    examples: [
      "sacrifício de Isaque no monte Moriá",
      "Deus proverá para si o cordeiro",
      "a fé de Abraão provada",
    ],
  },
  exodus_14_red_sea: {
    what: "A abertura milagrosa do Mar Vermelho por Moisés e a libertação do povo de Israel em Êxodo 14:13-31",
    examples: [
      "abertura do Mar Vermelho",
      "Moisés abre o mar",
      "passagem pelo meio do mar a pé enxuto",
    ],
  },
  exodus_20_commandments: {
    what: "Os Dez Mandamentos (Decálogo) entregues por Deus a Moisés no Monte Sinai em Êxodo 20:1-17",
    examples: [
      "os Dez Mandamentos",
      "tábuas da lei no Sinai",
      "não terás outros deuses diante de mim",
      "honra teu pai e tua mãe",
    ],
  },
  1samuel_17_david_goliath: {
    what: "Davi enfrenta e derruba o gigante filisteu Golias em nome do Senhor dos Exércitos em 1 Samuel 17:38-51",
    examples: [
      "Davi e Golias",
      "a luta de Davi contra o gigante",
      "tu vens a mim com espada e lança mas eu vou a ti em nome do Senhor",
    ],
  },
  psalm_1_blessed_man: {
    what: "O homem bem-aventurado que tem o seu prazer na lei do Senhor e é como árvore plantada junto a ribeiros em Salmos 1:1-6",
    examples: [
      "bem-aventurado o homem que não anda no conselho dos ímpios",
      "árvore plantada junto a ribeiros de águas",
      "medita de dia e de noite",
    ],
  },
  psalm_51_repentance: {
    what: "A oração de contrição e arrependimento de Davi pedindo um coração puro e a renovação do espírito em Salmos 51:1-12",
    examples: [
      "cria em mim um coração puro ó Deus",
      "tem misericórdia de mim segundo a tua benignidade",
      "não me lances fora da tua presença",
    ],
  },
  psalm_121_help: {
    what: "O socorro que vem do Senhor que fez os céus e a terra e não tosquenejará em Salmos 121:1-8",
    examples: [
      "elevo os olhos para os montes de onde me virá o socorro",
      "o meu socorro vem do Senhor",
      "o Senhor guardará a tua entrada e a tua saída",
    ],
  },
  psalm_139_omnipresence: {
    what: "A onisciência e onipresença de Deus que sonda e conhece o coração humano em Salmos 139:1-18",
    examples: [
      "Senhor tu me sondas e me conheces",
      "para onde me ausentarei do teu espírito",
      "de modo assombroso e tão maravilhoso fui feito",
    ],
  },
  proverbs_3_trust: {
    what: "Confiar no Senhor de todo o coração e não se apoiar no próprio entendimento em Provérbios 3:5-12",
    examples: [
      "confia no Senhor de todo o teu coração",
      "não te estribes no teu próprio entendimento",
      "reconhece-o em todos os teus caminhos",
    ],
  },
  ecclesiastes_3_time_season: {
    what: "Tudo tem o seu tempo determinado e há tempo para todo o propósito debaixo do céu em Eclesiastes 3:1-8",
    examples: [
      "tudo tem o seu tempo determinado",
      "tempo de nascer e tempo de morrer",
      "tempo de chorar e tempo de rir",
    ],
  },
  isaiah_9_unto_us_child: {
    what: "A profecia messiânica do Menino que nos nasceu, Maravilhoso Conselheiro e Príncipe da Paz em Isaías 9:6-7",
    examples: [
      "porque um menino nos nasceu um filho se nos deu",
      "Maravilhoso Conselheiro Deus Forte Pai da Eternidade Príncipe da Paz",
    ],
  },
  daniel_6_lions_den: {
    what: "Daniel na cova dos leões pela fidelidade na oração e o livramento divino em Daniel 6:10-23",
    examples: [
      "Daniel na cova dos leões",
      "Deus enviou o seu anjo e fechou a boca dos leões",
    ],
  },
  matthew_7_ask_seek_knock: {
    what: "Pedi e dar-se-vos-á, buscai e encontrareis, batei e abrir-se-vos-á em Mateus 7:7-12",
    examples: [
      "pedi e dar-se-vos-á",
      "buscai e encontrareis batei e abrir-se-vos-á",
      "a regra de ouro tudo o que vós quereis que os homens vos façam",
    ],
  },
  matthew_11_weary_rest: {
    what: "O convite de Jesus aos cansados e oprimidos para encontrar descanso para as almas em Mateus 11:28-30",
    examples: [
      "vinde a mim todos os que estais cansados e oprimidos e eu vos aliviarei",
      "tomai sobre vós o meu jugo e aprendei de mim",
      "o meu jugo é suave e o meu fardo é leve",
    ],
  },
  matthew_25_sheep_goats: {
    what: "O julgamento final separando ovelhas e bodes conforme o amor aos pequeninos em Mateus 25:31-46",
    examples: [
      "julgamento das ovelhas e dos bodes",
      "tive fome e destes-me de comer tive sede e destes-me de beber",
      "quando a um destes meus pequeninos irmãos o fizestes a mim o fizestes",
    ],
  },
  matthew_28_great_commission: {
    what: "A Grande Comissão de Jesus para fazer discípulos de todas as nações em Mateus 28:16-20",
    examples: [
      "a Grande Comissão",
      "ide fazei discípulos de todas as nações",
      "batizando-os em nome do Pai e do Filho e do Espírito Santo",
      "eis que estou convosco todos os dias até a consumação dos séculos",
    ],
  },
  luke_2_nativity: {
    what: "O nascimento de Jesus em Belém, os anjos e os pastores no campo em Lucas 2:1-20",
    examples: [
      "nascimento de Jesus em Belém",
      "glória a Deus nas maiores alturas e paz na terra",
      "envolto em panos e deitado numa manjedoura",
    ],
  },
  luke_10_good_samaritan: {
    what: "A parábola do Bom Samaritano ensinada por Jesus sobre quem é o próximo em Lucas 10:25-37",
    examples: [
      "parábola do bom samaritano",
      "quem é o meu próximo",
      "o sacerdote e o levita passaram de largo",
      "o samaritano cuidou das feridas",
    ],
  },
  luke_15_prodigal_son: {
    what: "A parábola do Filho Pródigo que regressa arrependido e é acolhido pelo Pai em Lucas 15:11-32",
    examples: [
      "parábola do filho pródigo",
      "o filho que gastou sua herança e voltou",
      "este meu filho estava morto e reviveu",
    ],
  },
  john_3_born_again: {
    what: "O diálogo com Nicodemos sobre nascer de novo da água e do Espírito e o amor salvífico de Deus em João 3:1-21",
    examples: [
      "necessário vos é nascer de novo",
      "diálogo de Jesus com Nicodemos",
      "porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito",
    ],
  },
  john_4_samaritan_woman: {
    what: "O diálogo de Jesus com a mulher samaritana junto à fonte sobre a água viva e os verdadeiros adoradores em João 4:7-26",
    examples: [
      "a mulher samaritana junto ao poço",
      "a água viva que jorra para a vida eterna",
      "os verdadeiros adoradores adorarão o Pai em espírito e em verdade",
    ],
  },
  john_10_good_shepherd: {
    what: "Jesus como o Bom Pastor que dá a vida pelas suas ovelhas em João 10:1-18",
    examples: [
      "Eu sou o bom pastor o bom pastor dá a sua vida pelas ovelhas",
      "as minhas ovelhas ouvem a minha voz",
      "eu vim para que tenham vida e a tenham com abundância",
    ],
  },
  john_14_way_truth_life: {
    what: "Jesus como o caminho, a verdade e a vida e a promessa do Espírito Consolador em João 14:1-14",
    examples: [
      "Eu sou o caminho e a verdade e a vida",
      "ninguém vem ao Pai senão por mim",
      "não se turbe o vosso coração",
      "na casa de meu Pai há muitas moradas",
    ],
  },
  john_15_true_vine: {
    what: "A videira verdadeira, o Pai como agricultor e a permanência dos ramos em Cristo em João 15:1-11",
    examples: [
      "Eu sou a videira verdadeira e meu Pai é o lavrador",
      "sem mim nada podeis fazer",
      "permanecei em mim e eu em vós",
    ],
  },
  acts_2_pentecost: {
    what: "A descida do Espírito Santo no dia de Pentecostes, línguas repartidas como que de fogo em Atos 2:1-13",
    examples: [
      "dia de Pentecostes",
      "descida e derramamento do Espírito Santo",
      "línguas repartidas como que de fogo",
      "todos foram cheios do Espírito Santo",
    ],
  },
  romans_12_living_sacrifice: {
    what: "Apresentar o corpo como sacrifício vivo e santo e a transformação pela renovação da mente em Romanos 12:1-21",
    examples: [
      "apresenteis os vossos corpos em sacrifício vivo santo e agradável a Deus",
      "não vos conformeis com este mundo",
      "transformai-vos pela renovação do vosso entendimento",
      "vence o mal com o bem",
    ],
  },
  galatians_5_fruit_spirit: {
    what: "O fruto do Espírito (amor, gozo, paz, longanimidade...) contra as obras da carne em Gálatas 5:16-26",
    examples: [
      "o fruto do Espírito é amor gozo paz",
      "obras da carne e fruto do espírito",
      "andai em Espírito e não cumprireis a concupiscência da carne",
    ],
  },
  colossians_3_new_man: {
    what: "Buscai as coisas que são de cima e revesti-vos da nova natureza em Cristo em Colossenses 3:1-17",
    examples: [
      "se já ressuscitastes com Cristo buscai as coisas que são de cima",
      "revesti-vos do novo homem",
      "a paz de Deus domine em vossos corações",
    ],
  },
  hebrews_11_faith: {
    what: "A definição da fé e a galeria dos heróis da fé do Antigo Testamento em Hebreus 11:1-16",
    examples: [
      "a fé é o firme fundamento das coisas que se esperam",
      "a prova das coisas que se não veem",
      "sem fé é impossível agradar a Deus",
      "os heróis da fé",
    ],
  },
  hebrews_12_cloud_witnesses: {
    what: "Correr a carreira proposta olhando firmemente para Jesus, autor e consumador da fé em Hebreus 12:1-3",
    examples: [
      "olhando para Jesus autor e consumador da fé",
      "rodeados de tão grande nuvem de testemunhas",
      "deixemos todo o embaraço e o pecado que tão de perto nos rodeia",
    ],
  },
  james_1_wisdom_trials: {
    what: "A paciência diante das provações e pedir sabedoria a Deus que a concede com generosidade em Tiago 1:2-12",
    examples: [
      "tende grande gozo quando cairdes em várias tentações",
      "se alguém tem falta de sabedoria peça-a a Deus",
      "a prova da vossa fé opera a paciência",
    ],
  },
  james_2_faith_works: {
    what: "A relação indissociável entre a fé viva e as obras de justiça em Tiago 2:14-26",
    examples: [
      "a fé se não tiver obras é morta em si mesma",
      "mostra-me a tua fé sem obras e eu te mostrarei a minha fé pelas minhas obras",
    ],
  },
  2timothy_3_scripture: {
    what: "A inspiração divina de toda a Escritura sagrada e sua suficiência para o ensino e edificação em 2 Timóteo 3:14-17",
    examples: [
      "toda a Escritura é divinamente inspirada por Deus",
      "proveitosa para ensinar redarguir corrigir e instruir em justiça",
    ],
  },
  1john_4_god_is_love: {
    what: "A mensagem de que Deus é amor e que o perfeito amor lança fora todo temor em 1 João 4:7-21",
    examples: [
      "Deus é amor",
      "amemo-nos uns aos outros porque o amor é de Deus",
      "no amor não há temor antes o perfeito amor lança fora o temor",
    ],
  },
  revelation_21_new_jerusalem: {
    what: "A visão do novo céu, nova terra e a Nova Jerusalém descendo do céu sem dor nem lágrimas em Apocalipse 21:1-8",
    examples: [
      "novo céu e nova terra",
      "a Santa Cidade a Nova Jerusalém",
      "Deus limpará de seus olhos toda lágrima",
      "não haverá mais morte nem pranto nem dor",
    ],
  },
  malachi_3_tithes: {
    what: "Trazer os dízimos e ofertas à casa do tesouro e a bênção das janelas do céu abertas em Malaquias 3:8-12",
    examples: [
      "roubará o homem a Deus nos dízimos e nas ofertas",
      "trazei todos os dízimos à casa do tesouro",
      "abrir as janelas do céu e derramar bênção sem medida",
    ],
  },
  joshua_1_courage: {
    what: "A ordem de ser forte e corajoso e meditar na Palavra dia e noite na conquista da terra em Josué 1:1-9",
    examples: [
      "esforça-te e tem bom ânimo",
      "não temas nem te espantes porque o Senhor teu Deus é contigo",
      "não se aparte da tua boca o livro desta lei",
    ],
  },
  micah_6_justice_mercy: {
    what: "O que o Senhor requer do homem: praticar a justiça, amar a misericórdia e andar humildemente em Miqueias 6:6-8",
    examples: [
      "o que o Senhor pede de ti",
      "praticar a justiça amar a misericórdia e andar humildemente com teu Deus",
    ],
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
    // 1. Verificação de Autenticação (Chave de API do App ou Sessão do Leitor)
    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("apikey");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const token = (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : apiKey)?.trim() ?? "";

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Autorização ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente interno para leitura das Escrituras no banco de dados com service_role
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

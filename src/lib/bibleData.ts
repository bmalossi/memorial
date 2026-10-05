/**
 * bibleData.ts — Canon bíblico e dados de leitura do Memorial
 * Alinhado com o padrão canônico do Bíblia Vive
 */

export interface BibleBookInfo {
  name: string;
  slug: string;
  testament: 'AT' | 'NT';
  chapters: number;
  abbrev: string;
}

export const BIBLE_BOOKS: BibleBookInfo[] = [
  // ── Antigo Testamento (39 livros) ──
  { name: 'Gênesis', slug: 'gn', testament: 'AT', chapters: 50, abbrev: 'Gn' },
  { name: 'Êxodo', slug: 'ex', testament: 'AT', chapters: 40, abbrev: 'Ex' },
  { name: 'Levítico', slug: 'lv', testament: 'AT', chapters: 27, abbrev: 'Lv' },
  { name: 'Números', slug: 'nm', testament: 'AT', chapters: 36, abbrev: 'Nm' },
  { name: 'Deuteronômio', slug: 'dt', testament: 'AT', chapters: 34, abbrev: 'Dt' },
  { name: 'Josué', slug: 'js', testament: 'AT', chapters: 24, abbrev: 'Js' },
  { name: 'Juízes', slug: 'jz', testament: 'AT', chapters: 21, abbrev: 'Jz' },
  { name: 'Rute', slug: 'rt', testament: 'AT', chapters: 4, abbrev: 'Rt' },
  { name: '1 Samuel', slug: '1sm', testament: 'AT', chapters: 31, abbrev: '1Sm' },
  { name: '2 Samuel', slug: '2sm', testament: 'AT', chapters: 24, abbrev: '2Sm' },
  { name: '1 Reis', slug: '1rs', testament: 'AT', chapters: 22, abbrev: '1Rs' },
  { name: '2 Reis', slug: '2rs', testament: 'AT', chapters: 25, abbrev: '2Rs' },
  { name: '1 Crônicas', slug: '1cr', testament: 'AT', chapters: 29, abbrev: '1Cr' },
  { name: '2 Crônicas', slug: '2cr', testament: 'AT', chapters: 36, abbrev: '2Cr' },
  { name: 'Esdras', slug: 'ed', testament: 'AT', chapters: 10, abbrev: 'Ed' },
  { name: 'Neemias', slug: 'ne', testament: 'AT', chapters: 13, abbrev: 'Ne' },
  { name: 'Ester', slug: 'et', testament: 'AT', chapters: 10, abbrev: 'Et' },
  { name: 'Jó', slug: 'jo', testament: 'AT', chapters: 42, abbrev: 'Jó' },
  { name: 'Salmos', slug: 'sl', testament: 'AT', chapters: 150, abbrev: 'Sl' },
  { name: 'Provérbios', slug: 'pv', testament: 'AT', chapters: 31, abbrev: 'Pv' },
  { name: 'Eclesiastes', slug: 'ec', testament: 'AT', chapters: 12, abbrev: 'Ec' },
  { name: 'Cânticos', slug: 'ct', testament: 'AT', chapters: 8, abbrev: 'Ct' },
  { name: 'Isaías', slug: 'is', testament: 'AT', chapters: 66, abbrev: 'Is' },
  { name: 'Jeremias', slug: 'jr', testament: 'AT', chapters: 52, abbrev: 'Jr' },
  { name: 'Lamentações', slug: 'lm', testament: 'AT', chapters: 5, abbrev: 'Lm' },
  { name: 'Ezequiel', slug: 'ez', testament: 'AT', chapters: 48, abbrev: 'Ez' },
  { name: 'Daniel', slug: 'dn', testament: 'AT', chapters: 12, abbrev: 'Dn' },
  { name: 'Oséias', slug: 'os', testament: 'AT', chapters: 14, abbrev: 'Os' },
  { name: 'Joel', slug: 'jl', testament: 'AT', chapters: 3, abbrev: 'Jl' },
  { name: 'Amós', slug: 'am', testament: 'AT', chapters: 9, abbrev: 'Am' },
  { name: 'Obadias', slug: 'ob', testament: 'AT', chapters: 1, abbrev: 'Ob' },
  { name: 'Jonas', slug: 'jn', testament: 'AT', chapters: 4, abbrev: 'Jn' },
  { name: 'Miquéias', slug: 'mq', testament: 'AT', chapters: 7, abbrev: 'Mq' },
  { name: 'Naum', slug: 'na', testament: 'AT', chapters: 3, abbrev: 'Na' },
  { name: 'Habacuque', slug: 'hc', testament: 'AT', chapters: 3, abbrev: 'Hc' },
  { name: 'Sofonias', slug: 'sf', testament: 'AT', chapters: 3, abbrev: 'Sf' },
  { name: 'Ageu', slug: 'ag', testament: 'AT', chapters: 2, abbrev: 'Ag' },
  { name: 'Zacarias', slug: 'zc', testament: 'AT', chapters: 14, abbrev: 'Zc' },
  { name: 'Malaquias', slug: 'ml', testament: 'AT', chapters: 4, abbrev: 'Ml' },

  // ── Novo Testamento (27 livros) ──
  { name: 'Mateus', slug: 'mt', testament: 'NT', chapters: 28, abbrev: 'Mt' },
  { name: 'Marcos', slug: 'mc', testament: 'NT', chapters: 16, abbrev: 'Mc' },
  { name: 'Lucas', slug: 'lc', testament: 'NT', chapters: 24, abbrev: 'Lc' },
  { name: 'João', slug: 'joa', testament: 'NT', chapters: 21, abbrev: 'Jo' },
  { name: 'Atos', slug: 'atos', testament: 'NT', chapters: 28, abbrev: 'At' },
  { name: 'Romanos', slug: 'rm', testament: 'NT', chapters: 16, abbrev: 'Rm' },
  { name: '1 Coríntios', slug: '1co', testament: 'NT', chapters: 16, abbrev: '1Co' },
  { name: '2 Coríntios', slug: '2co', testament: 'NT', chapters: 13, abbrev: '2Co' },
  { name: 'Gálatas', slug: 'gl', testament: 'NT', chapters: 6, abbrev: 'Gl' },
  { name: 'Efésios', slug: 'ef', testament: 'NT', chapters: 6, abbrev: 'Ef' },
  { name: 'Filipenses', slug: 'fp', testament: 'NT', chapters: 4, abbrev: 'Fp' },
  { name: 'Colossenses', slug: 'cl', testament: 'NT', chapters: 4, abbrev: 'Cl' },
  { name: '1 Tessalonicenses', slug: '1ts', testament: 'NT', chapters: 5, abbrev: '1Ts' },
  { name: '2 Tessalonicenses', slug: '2ts', testament: 'NT', chapters: 3, abbrev: '2Ts' },
  { name: '1 Timóteo', slug: '1tm', testament: 'NT', chapters: 6, abbrev: '1Tm' },
  { name: '2 Timóteo', slug: '2tm', testament: 'NT', chapters: 4, abbrev: '2Tm' },
  { name: 'Tito', slug: 'tt', testament: 'NT', chapters: 3, abbrev: 'Tt' },
  { name: 'Filemom', slug: 'fm', testament: 'NT', chapters: 1, abbrev: 'Fm' },
  { name: 'Hebreus', slug: 'hb', testament: 'NT', chapters: 13, abbrev: 'Hb' },
  { name: 'Tiago', slug: 'tg', testament: 'NT', chapters: 5, abbrev: 'Tg' },
  { name: '1 Pedro', slug: '1pe', testament: 'NT', chapters: 5, abbrev: '1Pe' },
  { name: '2 Pedro', slug: '2pe', testament: 'NT', chapters: 3, abbrev: '2Pe' },
  { name: '1 João', slug: '1jo', testament: 'NT', chapters: 5, abbrev: '1Jo' },
  { name: '2 João', slug: '2jo', testament: 'NT', chapters: 1, abbrev: '2Jo' },
  { name: '3 João', slug: '3jo', testament: 'NT', chapters: 1, abbrev: '3Jo' },
  { name: 'Judas', slug: 'jd', testament: 'NT', chapters: 1, abbrev: 'Jd' },
  { name: 'Apocalipse', slug: 'ap', testament: 'NT', chapters: 22, abbrev: 'Ap' },
];

export interface BibleVerseItem {
  number: number;
  text: string;
}

export interface BibleChapterData {
  bookName: string;
  bookSlug: string;
  chapter: number;
  title?: string;
  verses: BibleVerseItem[];
}

/**
 * Banco offline de passagens chave para renderização instantânea
 * e resiliência offline completa.
 */
const OFFLINE_CHAPTERS: Record<string, BibleChapterData> = {
  'sl:23': {
    bookName: 'Salmos',
    bookSlug: 'sl',
    chapter: 23,
    title: 'O Senhor é o meu pastor',
    verses: [
      { number: 1, text: 'O SENHOR é o meu pastor, nada me faltará.' },
      { number: 2, text: 'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranqüilas.' },
      { number: 3, text: 'Refrigera a minha alma; guia-me pelas veredas da justiça, por amor do seu nome.' },
      { number: 4, text: 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.' },
      { number: 5, text: 'Preparas uma mesa perante mim na presença dos meus inimigos, unges a minha cabeça com óleo, o meu cálice transborda.' },
      { number: 6, text: 'Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na casa do SENHOR por longos dias.' },
    ],
  },
  'sl:91': {
    bookName: 'Salmos',
    bookSlug: 'sl',
    chapter: 91,
    title: 'Aquele que habita no esconderijo do Altíssimo',
    verses: [
      { number: 1, text: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.' },
      { number: 2, text: 'Direi do SENHOR: Ele é o meu Deus, o meu refúgio, a minha fortaleza, e nele confiarei.' },
      { number: 3, text: 'Porque ele te livrará do laço do passarinheiro, e da peste perniciosa.' },
      { number: 4, text: 'Ele te cobrirá com as suas penas, e debaixo das suas asas te confiarás; a sua verdade será o teu escudo e broquel.' },
      { number: 5, text: 'Não terás medo do terror de noite nem da seta que voa de dia.' },
      { number: 6, text: 'Nem da peste que anda na escuridão, nem da mortandade que assola ao meio-dia.' },
      { number: 7, text: 'Mil cairão ao teu lado, e dez mil à tua direita, mas não chegará a ti.' },
      { number: 8, text: 'Somente com os teus olhos contemplarás, e verás a recompensa dos ímpios.' },
      { number: 9, text: 'Porque tu, ó SENHOR, és o meu refúgio. No Altíssimo fizeste a tua habitação.' },
      { number: 10, text: 'Nenhum mal te sucederá, nem praga alguma chegará à tua tenda.' },
      { number: 11, text: 'Porque aos seus anjos dará ordem a teu respeito, para te guardarem em todos os teus caminhos.' },
      { number: 12, text: 'Eles te sustentarão nas suas mãos, para que não tropeces com o teu pé em pedra.' },
      { number: 13, text: 'Pisarás o leão e a cobra; calcarás aos pés o filho do leão e a serpente.' },
      { number: 14, text: 'Porquanto tão encarecidamente me amou, também eu o livrarei; pô-lo-ei em retiro alto, porque conheceu o meu nome.' },
      { number: 15, text: 'Ele me invocará, e eu lhe responderei; estarei com ele na angústia; dela o retirarei, e o glorificarei.' },
      { number: 16, text: 'Fartá-lo-ei com longura de dias, e lhe mostrarei a minha salvação.' },
    ],
  },
  'fp:4': {
    bookName: 'Filipenses',
    bookSlug: 'fp',
    chapter: 4,
    title: 'Alegria e contentamento no Senhor',
    verses: [
      { number: 1, text: 'Portanto, meus amados e mui queridos irmãos, minha alegria e coroa, permanecei assim firmes no Senhor, amados.' },
      { number: 2, text: 'Rogo a Evódia, e rogo a Síntique, que sintam o mesmo no Senhor.' },
      { number: 3, text: 'E peço-te também a ti, meu verdadeiro companheiro, que ajudes essas mulheres que trabalharam comigo no evangelho.' },
      { number: 4, text: 'Regozijai-vos sempre no Senhor; outra vez digo, regozijai-vos.' },
      { number: 5, text: 'Seja a vossa eqüidade notória a todos os homens. Perto está o Senhor.' },
      { number: 6, text: 'Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças.' },
      { number: 7, text: 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.' },
      { number: 8, text: 'Quanto ao mais, irmãos, tudo o que é verdadeiro, tudo o que é honesto, tudo o que é justo, tudo o que é puro, tudo o que é amável, tudo o que é de boa fama, se há alguma virtude, e se há algum louvor, nisso pensai.' },
      { number: 9, text: 'O que também aprendestes, e recebestes, e ouvistes, e vistes em mim, isso fazei; e o Deus de paz será convosco.' },
      { number: 10, text: 'Ora, muito me regozijei no Senhor por finalmente reviver a vossa lembrança de mim; pois já vos tínheis lembrado, mas vos faltava oportunidade.' },
      { number: 11, text: 'Não digo isto como por necessidade, porque já aprendi a contentar-me com o que tenho.' },
      { number: 12, text: 'Sei estar abatido, e sei também ter abundância; em toda a maneira, e em todas as coisas estou instruído, tanto a ter fartura, como a ter fome; tanto a ter abundância, como a padecer necessidade.' },
      { number: 13, text: 'Posso todas as coisas em Cristo que me fortalece.' },
      { number: 14, text: 'Todavia fizestes bem em tomar parte na minha aflição.' },
      { number: 15, text: 'E bem sabeis também, ó filipenses, que, no princípio do evangelho, quando parti da Macedônia, nenhuma igreja comunicou comigo com respeito a dar e a receber, senão vós somente;' },
      { number: 16, text: 'Porque também uma e outra vez me mandastes o necessário a Tessalônica.' },
      { number: 17, text: 'Não que procure dádivas, mas procuro o fruto que cresça para a vossa conta.' },
      { number: 18, text: 'Mas bastante tenho recebido, e tenho abundância. Cheio estou, depois que recebi de Epafrodito o que da vossa parte me foi enviado, como cheiro de suavidade e sacrifício agradável e aprazível a Deus.' },
      { number: 19, text: 'O meu Deus, segundo as suas riquezas em glória, suprirá todas as vossas necessidades em Cristo Jesus.' },
      { number: 20, text: 'Ora, a nosso Deus e Pai seja dada glória para todo o sempre. Amém.' },
    ],
  },
  'rm:8': {
    bookName: 'Romanos',
    bookSlug: 'rm',
    chapter: 8,
    title: 'A vida no Espírito e o amor inseparável de Deus',
    verses: [
      { number: 1, text: 'Portanto, agora nenhuma condenação há para os que estão em Cristo Jesus, que não andam segundo a carne, mas segundo o Espírito.' },
      { number: 2, text: 'Porque a lei do Espírito de vida, em Cristo Jesus, me livrou da lei do pecado e da morte.' },
      { number: 14, text: 'Porque todos os que são guiados pelo Espírito de Deus, esses são filhos de Deus.' },
      { number: 18, text: 'Porque para mim tenho por certo que as aflições deste tempo presente não são para comparar com a glória que em nós há de ser revelada.' },
      { number: 26, text: 'E da mesma maneira também o Espírito ajuda as nossas fraquezas; porque não sabemos o que havemos de pedir como convém, mas o mesmo Espírito intercede por nós com gemidos inexprimíveis.' },
      { number: 28, text: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.' },
      { number: 31, text: 'Que diremos, pois, a estas coisas? Se Deus é por nós, quem será contra nós?' },
      { number: 37, text: 'Mas em todas estas coisas somos mais do que vencedores, por aquele que nos amou.' },
      { number: 38, text: 'Porque estou certo de que, nem a morte, nem a vida, nem os anjos, nem os principados, nem as potestades, nem o presente, nem o porvir,' },
      { number: 39, text: 'Nem a altura, nem a profundidade, nem alguma outra criatura nos poderá separar do amor de Deus, que está em Cristo Jesus nosso Senhor.' },
    ],
  },
  'joa:1': {
    bookName: 'João',
    bookSlug: 'joa',
    chapter: 1,
    title: 'O Verbo se fez carne',
    verses: [
      { number: 1, text: 'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.' },
      { number: 2, text: 'Ele estava no princípio com Deus.' },
      { number: 3, text: 'Todas as coisas foram feitas por ele, e sem ele nada do que foi feito se fez.' },
      { number: 4, text: 'Nele estava a vida, e a vida era a luz dos homens.' },
      { number: 5, text: 'E a luz resplandece nas trevas, e as trevas não a compreenderam.' },
      { number: 12, text: 'Mas, a todos quantos o receberam, deu-lhes o poder de serem feitos filhos de Deus, aos que crêem no seu nome;' },
      { number: 14, text: 'E o Verbo se fez carne, e habitou entre nós, e vimos a sua glória, como a glória do unigênito do Pai, cheio de graça e de verdade.' },
    ],
  },
  'sl:120': {
    bookName: 'Salmos',
    bookSlug: 'sl',
    chapter: 120,
    title: 'Cântico dos degraus. Oração na angústia',
    verses: [
      { number: 1, text: 'Na minha angústia clamei ao SENHOR, e me ouviu.' },
      { number: 2, text: 'Senhor, livra a minha alma dos lábios mentirosos e da língua enganadora.' },
      { number: 3, text: 'Que te será dado, ou que te será acrescentado, língua enganadora?' },
      { number: 4, text: 'Flechas agudas do poderoso, com brasas vivas de zimbro.' },
      { number: 5, text: 'Ai de mim, que peregrino em Meseque, e habito nas tendas de Quedar.' },
      { number: 6, text: 'A minha alma bastante tempo habitou com os que detestam a paz.' },
      { number: 7, text: 'Pacífico sou, mas quando eu falo já eles procuram a guerra.' },
    ],
  },
  'jo:6': {
    bookName: 'Jó',
    bookSlug: 'jo',
    chapter: 6,
    title: 'Resposta de Jó aos seus amigos',
    verses: [
      { number: 1, text: 'Então Jó respondeu, e disse:' },
      { number: 2, text: 'Oh! se a minha queixa de fato se pesasse, e a minha calamidade se pusesse juntamente numa balança!' },
      { number: 24, text: 'Ensinai-me, e eu me calarei; e fazei-me entender em que errei.' },
      { number: 26, text: 'Porventura buscareis palavras para me repreenderdes, visto que as razões do desesperado são como vento?' },
    ],
  },
};

/**
 * Mapeamento Canônico dos slugs do Bíblia Vive para os nomes de pastas
 * do repositório público ACF (MatheusGois/bible).
 * Garante que os 66 livros da Bíblia sejam encontrados sem erro 404.
 */
export const ROUTE_TO_GITHUB_ID: Record<string, string> = {
  sl: 'ps',     // Salmos -> ps (Corrige Salmos 120 e todos os Salmos)
  ps: 'ps',
  pv: 'prv',    // Provérbios -> prv
  ct: 'so',     // Cânticos -> so
  jo: 'job',    // Jó (slug canônico 'jo') -> job
  job: 'job',   // Jó alias
  joa: 'jo',    // João (slug canônico 'joa') -> jo
  atos: 'act',  // Atos (slug canônico 'atos') -> act
  at: 'act',    // Atos alias
  jz: 'jud',    // Juízes -> jud
  '1rs': '1kgs', // 1 Reis
  '2rs': '2kgs', // 2 Reis
  '1cr': '1ch',  // 1 Crônicas
  '2cr': '2ch',  // 2 Crônicas
  os: 'ho',     // Oséias -> ho
  mq: 'mi',     // Miquéias -> mi
  hc: 'hk',     // Habacuque -> hk
  sf: 'zp',     // Sofonias -> zp
  ag: 'hg',     // Ageu -> hg
  mc: 'mk',     // Marcos -> mk
  lc: 'lk',     // Lucas -> lk
  ef: 'eph',    // Efésios -> eph
  fp: 'ph',     // Filipenses -> ph
  tg: 'jm',     // Tiago -> jm
  ap: 're',     // Apocalipse -> re
  ed: 'ezr',    // Esdras -> ezr
  fm: 'phm',    // Filemom -> phm
};

/**
 * Normaliza slug para compatibilidade de busca e rotas.
 * Trata com precisão a distinção entre Jó ('jo') e João ('joa').
 */
export function normalizeBookSlug(input: string): string {
  if (!input) return 'sl';
  const clean = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  // Salmos
  if (clean === 'salmos' || clean === 'salmo' || clean === 'sl' || clean === 'ps') return 'sl';
  // Jó vs João
  if (clean === 'jo' || clean === 'job') return 'jo';
  if (clean === 'joao' || clean === 'joa' || clean === 'joh') return 'joa';
  // Atos
  if (clean === 'atos' || clean === 'at' || clean === 'act') return 'atos';
  // Demais mapeamentos frequentes
  if (clean === 'filipenses' || clean === 'fp' || clean === 'ph' || clean === 'phi') return 'fp';
  if (clean === 'romanos' || clean === 'rm' || clean === 'rom') return 'rm';
  if (clean === 'isaias' || clean === 'is' || clean === 'isa') return 'is';
  if (clean === 'proverbios' || clean === 'pv' || clean === 'prv' || clean === 'pro') return 'pv';
  if (clean === 'hebreus' || clean === 'hb' || clean === 'heb') return 'hb';
  if (clean === '2reis' || clean === '2rs' || clean === '2kgs') return '2rs';
  if (clean === '1reis' || clean === '1rs' || clean === '1kgs') return '1rs';
  if (clean === 'deuteronomio' || clean === 'dt' || clean === 'deu') return 'dt';
  if (clean === '1samuel' || clean === '1sm' || clean === 'sa1') return '1sm';
  if (clean === '2samuel' || clean === '2sm' || clean === 'sa2') return '2sm';
  if (clean === '1cronicas' || clean === '1cr' || clean === '1ch' || clean === 'ch1') return '1cr';
  if (clean === '2cronicas' || clean === '2cr' || clean === '2ch' || clean === 'ch2') return '2cr';
  if (clean === 'canticos' || clean === 'ct' || clean === 'so' || clean === 'sol') return 'ct';
  if (clean === 'oseias' || clean === 'os' || clean === 'ho' || clean === 'hos') return 'os';
  if (clean === 'miqueias' || clean === 'mq' || clean === 'mi' || clean === 'mic') return 'mq';
  if (clean === 'habacuque' || clean === 'hc' || clean === 'hk' || clean === 'hab') return 'hc';
  if (clean === 'sofonias' || clean === 'sf' || clean === 'zp' || clean === 'zep') return 'sf';
  if (clean === 'ageu' || clean === 'ag' || clean === 'hg' || clean === 'hag') return 'ag';
  if (clean === 'marcos' || clean === 'mc' || clean === 'mk' || clean === 'mar') return 'mc';
  if (clean === 'lucas' || clean === 'lc' || clean === 'lk' || clean === 'luk') return 'lc';
  if (clean === 'efesios' || clean === 'ef' || clean === 'eph') return 'ef';
  if (clean === 'tiago' || clean === 'tg' || clean === 'jm' || clean === 'jam') return 'tg';
  if (clean === 'apocalipse' || clean === 'ap' || clean === 're' || clean === 'rev') return 'ap';
  if (clean === 'esdras' || clean === 'ed' || clean === 'ezr') return 'ed';
  if (clean === 'filemom' || clean === 'fm' || clean === 'phm' || clean === 'plm') return 'fm';
  if (clean === 'juizes' || clean === 'jz' || clean === 'jud' || clean === 'jdg') return 'jz';

  return clean;
}

export function findBook(slugOrName: string): BibleBookInfo | undefined {
  if (!slugOrName) return undefined;
  const norm = normalizeBookSlug(slugOrName);
  const cleanInput = slugOrName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return BIBLE_BOOKS.find((b) => {
    const normBookSlug = b.slug.toLowerCase();
    const cleanBookName = b.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const cleanBookAbbrev = b.abbrev
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    return (
      normBookSlug === norm ||
      cleanBookName === cleanInput ||
      cleanBookAbbrev === cleanInput ||
      cleanBookName === norm
    );
  });
}

/**
 * Busca capítulo bíblico com fallback resiliente e suporte aos 66 livros da Bíblia
 */
export async function loadBibleChapter(bookSlug: string, chapter: number): Promise<BibleChapterData> {
  const normSlug = normalizeBookSlug(bookSlug);
  const cacheKey = `${normSlug}:${chapter}`;

  // 1. Checa cache offline instantâneo
  if (OFFLINE_CHAPTERS[cacheKey]) {
    return OFFLINE_CHAPTERS[cacheKey];
  }

  const book = findBook(normSlug) || {
    name: normSlug.toUpperCase(),
    slug: normSlug,
    testament: 'AT' as const,
    chapters: 150,
    abbrev: normSlug,
  };

  // Mapeia para o ID exato da pasta no repositório GitHub (ex: sl -> ps, jo -> job, joa -> jo)
  const githubId = ROUTE_TO_GITHUB_ID[normSlug] || normSlug;

  // 2. Busca da API pública do GitHub (ACF - Almeida Corrigida Fiel)
  try {
    const url = `https://raw.githubusercontent.com/MaatheusGois/bible/main/versions/pt-br/acf/${githubId}/${githubId}.json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const chIdx = chapter - 1;
      if (data.chapters && data.chapters[chIdx]) {
        const versesRaw: string[] = data.chapters[chIdx];
        const loaded: BibleChapterData = {
          bookName: data.name || book.name,
          bookSlug: normSlug,
          chapter,
          verses: versesRaw.map((v, i) => ({
            number: i + 1,
            text: v.trim(),
          })),
        };
        // Salva em memória
        OFFLINE_CHAPTERS[cacheKey] = loaded;
        return loaded;
      }
    }
  } catch (e) {
    console.warn(`[Memorial Bible] Falha ao buscar capítulo online para ${normSlug} (${githubId}) ${chapter}:`, e);
  }

  // 3. Fallback sem internet caso não esteja em cache prévio
  return {
    bookName: book.name,
    bookSlug: normSlug,
    chapter,
    verses: [
      {
        number: 1,
        text: 'Não foi possível carregar o texto deste capítulo no momento. Verifique sua conexão com a internet.',
      },
    ],
  };
}

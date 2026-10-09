/**
 * classifierJEV.ts — Módulo de Classificação TypeSafe AI / JEV
 * 
 * Ecossistema Completo de Cuidado Pastoral (4 Pilares):
 * 1. CRISIS: Dor, desespero, luto, ideação de desistência ou crise espiritual grave.
 * 2. THEOLOGICAL_QUERY: Reflexão bíblica profunda, dúvida exegética ou passagem difícil.
 * 3. THANKSGIVING: Testemunho de vitória, conquista, paz, alegria ou gratidão a Deus.
 * 4. ANSWERED_PRAYER: Marcação explícita de uma oração que foi respondida.
 */

import { PastoralIntent, BibleRef } from './types';

export interface PastoralClassificationInput {
  text: string;
  title?: string;
  category?: string;
  is_answered?: boolean;
  bible_ref?: BibleRef;
  tags?: string[];
}

export interface PastoralClassificationResult {
  intent: PastoralIntent | null;
  confidence: number;
  reason: string;
  biblical_reference?: string;
  evaluated_at: string;
}

export interface PastoralPillCopy {
  title: string;
  prompt: string;
  buttonLabel: string;
  iconName: string;
}

// ── Padrões Semânticos e Heurísticas Determinísticas de Alta Precisão ──────────

const CRISIS_PATTERNS = [
  // ── Perda de vontade de viver / ideação de morte / ideação suicida ──
  /vontade de viver/i, // cobre "não tô com mais vontade de viver", "perdi a vontade de viver", "sem vontade de viver", etc.
  /vontade de morrer/i,
  /quer(o|ia|endo) morrer/i,
  /preferia morrer/i,
  /melhor morrer/i,
  /n[ãa]o (t[ôo]|estou|tenho|sinto|vejo).*(vontade|raz[ãa]o|motivo|sentido).*viver/i,
  /sem (vontade|raz[ãa]o|motivo|sentido).*viver/i,
  /perdi a vontade/i,
  /perder a vontade de viver/i,
  /n[ãa]o quero mais viver/i,
  /n[ãa]o aguent(o|ei) mais viver/i,
  /a vida perdeu o sentido/i,
  /n[ãa]o vale a pena viver/i,
  /para que viver/i,
  /pra que viver/i,
  /vontade de sumir/i,
  /quer(o|ia|endo) sumir/i,
  /desaparecer do mundo/i,
  /dormir e n[ãa]o acordar/i,
  /acabar com (tudo|a minha vida|a vida)/i,
  /tirar a (pr[óo]pria )?vida/i,
  /tirar minha vida/i,
  /suic[íi]d(io|a|ar)?/i,
  /desistir de viver/i,
  /desistir da vida/i,
  /vontade de desistir/i,
  /pensando em desistir/i,

  // ── Depressão e estados agudos de sofrimento emocional ──
  /depress[ãa]o/i,
  /depressiv[oa]s?/i,
  /deprimid[oa]s?/i,
  /crise depressiva/i,
  /quadro depressivo/i,
  /ang[úu]stia profunda/i,
  /ang[úu]stia insuport[áa]vel/i,
  /ang[úu]stia no peito/i,
  /dor insuport[áa]vel/i,
  /dor na alma/i,
  /dor emocional/i,
  /cora[çc][ãa]o dilacerado/i,
  /cora[çc][ãa]o em peda[çc]os/i,
  /vazio sem fim/i,
  /vazio profundo/i,
  /vazio por dentro/i,
  /desespero/i,
  /desesperad[oa]/i,
  /desesperan[çc]a/i,
  /n[ãa]o aguent(o|ei) mais/i,
  /n[ãa]o suport(o|ei) mais/i,
  /cheguei no (meu )?limite/i,
  /estou no limite/i,

  // ── Desorientação, solidão extrema e desamparo ──
  /n[ãa]o sei o que fazer da minha vida/i,
  /n[ãa]o sei mais o que fazer/i,
  /n[ãa]o sei o que fazer/i,
  /estou perdid[oa]/i,
  /t[ôo] perdid[oa]/i,
  /me sinto perdid[oa]/i,
  /completamente perdid[oa]/i,
  /completamente sozinh[oa]/i,
  /t[ôo] sozinh[oa]/i,
  /estou sozinh[oa]/i,
  /solid[ãa]o insuport[áa]vel/i,
  /ningu[ée]m se importa/i,
  /abandonad[oa] por todos/i,
  /perd(i|endo) as esperan[çc]as/i,
  /sem esperan[çc]a/i,
  /sem for[çc]as? para continuar/i,
  /sem for[çc]as? para lutar/i,
  /sem for[çc]as? para viver/i,
  /n[ãa]o vejo sa[íi]da/i,
  /n[ãa]o tem sa[íi]da/i,
  /sem sa[íi]da/i,

  // ── Clamor urgente e crise espiritual / luto ──
  /pedindo socorro/i,
  /grito de socorro/i,
  /socorro de deus/i,
  /deus me ajude.*n[ãa]o aguent/i,
  /deus me abandonou/i,
  /deus me esqueceu/i,
  /crise de f[ée]/i,
  /luto profundo/i,
  /perdi a cabe[çc]a/i,
  /pesadelo sem fim/i,
];

const ANSWERED_PRAYER_PATTERNS = [
  /(ora[çc][ãa]o|pedido|clamor|s[úu]plica)\s*respondid[ao]/i,
  /deus\s*respondeu/i,
  /o\s*senhor\s*respondeu/i,
  /deus\s*me\s*ouviu/i,
  /deus\s*nos\s*ouviu/i,
  /o\s*senhor\s*me\s*ouviu/i,
  /o\s*senhor\s*nos\s*ouviu/i,
  /deus\s*ouviu\s*(e\s*respondeu|meu\s*clamor|minha\s*ora[çc][ãa]o|minha\s*s[úu]plica|minha\s*voz|nosso\s*clamor)/i,
  /milagre\s*alcan[çc]ado/i,
  /vit[óo]ria\s*da\s*ora[çc][ãa]o/i,
  /resposta\s*de\s*ora[çc][ãa]o/i,
  /clamor\s*atendido/i,
  /promessa\s*cumprida/i,
  /ora[çc][ãa]o\s*atendida/i,
];

const THANKSGIVING_PATTERNS = [
  // ── Bênção divina e favor de Deus ──
  /aben[çc]oad[oa]s?/i, // cobre "fui abençoado", "fomos abençoados", "sou abençoado", "abençoada", "abençoados"
  /deus\s*(me\s*|nos\s*)?aben[çc]o(ou|e|ando|asse)/i,
  /o\s*senhor\s*(me\s*|nos\s*)?aben[çc]o(ou|e|ando)/i,
  /b[êe]n[çc][ãa]os?/i, // bênção, bênçãos
  /b[êe]n[çc][ãa]o\s*(de\s*deus|do\s*senhor|divina)/i,
  /deus\s*(operou|agiu|fez|interveio)/i,
  /o\s*senhor\s*(operou|agiu|fez)/i,
  /a\s*m[ãa]o\s*de\s*deus/i,
  /deus\s*[ée]\s*bom/i,
  /deus\s*tem\s*sido\s*bom/i,

  // ── Testemunho e proclamação comunitária ──
  /testemunh(ar|o|os|ando|ei|aremos|arei)/i, // cobre "testemunhar", "irei testemunhar", "vou testemunhar", "meu testemunho"
  /contar\s*(o\s*que\s*deus\s*fez|meu\s*testemunho|essa\s*vit[óo]ria|para\s*a\s*igreja)/i,
  /compartilhar\s*(essa\s*vit[óo]ria|essa\s*b[êe]n[çc][ãa]o|o\s*que\s*deus\s*fez)/i,
  /dar\s*(meu\s*)?testemunho/i,

  // ── Provisão, emprego, trabalho e portas abertas ──
  /(oportunidade|porta|vaga)\s*de\s*(trabalho|emprego)/i, // cobre "oportunidade de emprego", "porta de emprego", etc.
  /novo\s*(emprego|trabalho)/i,
  /consegui\s*(o|um)?\s*(emprego|trabalho|vaga)/i,
  /deus\s*abriu\s*(as\s*portas|uma\s*porta|portas)/i,
  /o\s*senhor\s*abriu\s*(as\s*portas|uma\s*porta|portas)/i,
  /porta(s)?\s*aberta(s)?/i,
  /provis[ãa]o(\s*(de\s*deus|do\s*senhor|divina|sobrenatural))?/i,
  /deus\s*(proveu|supr(iu|e))/i,
  /o\s*senhor\s*(proveu|supr(iu|e))/i,

  // ── Vitória, conquista, livramento e cura ──
  /vit[óo]ria/i,
  /vit[óo]rias/i,
  /conquista/i,
  /conquistas/i,
  /conquistei/i,
  /alcancei/i,
  /venci/i,
  /livramento/i,
  /livramentos/i,
  /deus\s*(me\s*|nos\s*)?livrou/i,
  /o\s*senhor\s*(me\s*|nos\s*)?livrou/i,
  /milagre/i,
  /milagres/i,
  /cura(d[oa])?/i,
  /fui\s*curad[oa]/i,
  /deus\s*(me\s*|nos\s*)?curou/i,
  /restaura[çc][ãa]o/i,
  /deus\s*restaurou/i,

  // ── Gratidão, louvor, celebração e alegria no Senhor ──
  /gratid[ãa]o/i,
  /gra[çc]as\s*a\s*deus/i,
  /gra[çc]as\s*ao\s*senhor/i,
  /sou\s*grat[oa]/i,
  /muito\s*grat[oa]/i,
  /agrade[çc](o|er|endo|emos)/i,
  /s[óo]\s*agradecer/i,
  /agradecida?/i,
  /gl[óo]ria\s*a\s*deus/i,
  /gl[óo]rias\s*a\s*deus/i,
  /aleluia/i,
  /aleluias/i,
  /louvado\s*seja\s*(deus|o\s*senhor|cristo|jesus)/i,
  /louvor/i,
  /louvores/i,
  /exaltado\s*seja/i,
  /deus\s*[ée]\s*fiel/i,
  /fidelidade\s*de\s*deus/i,
  /o\s*senhor\s*fez\s*maravilhas/i,
  /maravilhas\s*de\s*deus/i,
  /ebin[ée]zer/i,
  /alegria\s*no\s*cora[çc][ãa]o/i,
  /cora[çc][ãa]o\s*alegre/i,
  /cora[çc][ãa]o\s*transbordando/i,
  /cora[çc][ãa]o\s*grat[oa]/i,
  /cora[çc][ãa]o\s*cheio\s*de\s*gratid[ãa]o/i,
  /paz\s*no\s*cora[çc][ãa]o/i,
  /paz\s*de\s*deus/i,
  /feliz\s*com\s*deus/i,
  /muito\s*feliz/i,
  /deus\s*cumpriu/i,
  /promessa\s*(se\s*)?cumpriu/i,
];

const THEOLOGICAL_QUERY_PATTERNS = [
  /d[úu]vidas?/i,
  /gerou d[úu]vida/i,
  /fiquei na d[úu]vida/i,
  /estou com d[úu]vida/i,
  /te[óo]log(o|a)s?/i,
  /estudiosos/i,
  /question(o|ei|ando|amento|amentos)?/i,
  /jesus.*existiu/i,
  /historicidade/i,
  /apolog[ée]tica/i,
  /dificuldade de crer/i,
  /ser[áa] verdade/i,
  /ser[áa] que deus/i,
  /ser[áa] que jesus/i,
  /mito ou verdade/i,
  /d[úu]vida de estudo/i,
  /d[úu]vida sobre/i,
  /o que significa/i,
  /n[ãa]o entendi/i,
  /como entender/i,
  /qual o significado/i,
  /passagem dif[íi]cil/i,
  /exegese/i,
  /hermen[êe]utica/i,
  /contexto hist[óo]rico/i,
  /por que diz que/i,
  /contradi[çc][ãa]o aparente/i,
  /estudo b[íi]blico/i,
  /reflex[ãa]o profunda sobre/i,
  /como conciliar/i,
];

/**
 * Classificação determinística imediata de alta velocidade e precisão.
 * Torna 'Reflexão' um ambiente geral acolhedor onde todas as naturezas espirituais
 * (testemunho, oração, desabafos de aflição, dúvidas exegéticas) são analisadas
 * pelo motor JEV para correto encaminhamento pastoral e notificação.
 */
export function classifyPastoralIntentLocally(
  input: PastoralClassificationInput
): PastoralClassificationResult {
  const fullText = `${input.title ? input.title + '\n' : ''}${input.text || ''}`.trim();
  const lowerText = fullText.toLowerCase();
  const evaluatedAt = new Date().toISOString();
  const biblicalRef = input.bible_ref?.display || input.bible_ref?.book;

  // 1. Pilar 4: ANSWERED_PRAYER (Prioridade máxima caso haja marcação explícita ou linguagem de oração respondida)
  if (input.is_answered === true) {
    return {
      intent: 'ANSWERED_PRAYER',
      confidence: 0.99,
      reason: 'Marcação explícita de oração respondida pelo usuário.',
      biblical_reference: biblicalRef,
      evaluated_at: evaluatedAt,
    };
  }

  // Sensibilidade em Reflexão, Oração e Testemunho para respostas divinas
  const hasAnsweredMarker = ANSWERED_PRAYER_PATTERNS.some((pat) => pat.test(lowerText));
  if (hasAnsweredMarker) {
    return {
      intent: 'ANSWERED_PRAYER',
      confidence: 0.95,
      reason: 'Expressão de oração respondida identificada no relato.',
      biblical_reference: biblicalRef,
      evaluated_at: evaluatedAt,
    };
  }

  // 2. Pilar 1: CRISIS (Prioridade de segurança e acolhimento para desabafos de sofrimento)
  const isCrisis = CRISIS_PATTERNS.some((pat) => pat.test(lowerText));
  if (isCrisis) {
    return {
      intent: 'CRISIS',
      confidence: 0.95,
      reason: 'Sinais agudos de sofrimento, aflição interior ou crise espiritual detectados.',
      biblical_reference: biblicalRef,
      evaluated_at: evaluatedAt,
    };
  }

  // 3. Pilar 3: THANKSGIVING (Testemunho, bênção, provisão, alegria, gratidão)
  // Em Reflexão (ambiente geral acolhedor), expressões de vitória, bênção ou testemunho
  // qualificam confiavelmente para o pilar de Ação de Graças.
  const isThanksgiving = THANKSGIVING_PATTERNS.some((pat) => pat.test(lowerText));
  if (isThanksgiving || input.category === 'testemunho') {
    const conf = isThanksgiving ? 0.95 : 0.85;
    return {
      intent: 'THANKSGIVING',
      confidence: conf,
      reason: 'Testemunho de vitória, bênção recebida ou gratidão a Deus identificados no relato reflexivo.',
      biblical_reference: biblicalRef,
      evaluated_at: evaluatedAt,
    };
  }

  // 4. Pilar 2: THEOLOGICAL_QUERY (Passagem de estudo ou dúvida profunda)
  const isTheologicalQuery = THEOLOGICAL_QUERY_PATTERNS.some((pat) => pat.test(lowerText));
  const hasQuestionMark = fullText.includes('?');
  const hasRef = Boolean(input.bible_ref);

  if (isTheologicalQuery || (hasQuestionMark && (hasRef || fullText.length >= 20))) {
    return {
      intent: 'THEOLOGICAL_QUERY',
      confidence: isTheologicalQuery ? 0.92 : 0.85,
      reason: 'Questionamento de estudo bíblico, reflexão apologética ou dúvida sobre as Escrituras.',
      biblical_reference: biblicalRef,
      evaluated_at: evaluatedAt,
    };
  }

  return {
    intent: null,
    confidence: 0.0,
    reason: 'Relato neutro ou sem correspondência nos 4 pilares de cuidado.',
    biblical_reference: biblicalRef,
    evaluated_at: evaluatedAt,
  };
}

/**
 * Classificação híbrida: executa JEV TypeSafe AI via Edge Function com fallback local imediato.
 */
export async function classifyPastoralIntent(
  input: PastoralClassificationInput
): Promise<PastoralClassificationResult> {
  const localResult = classifyPastoralIntentLocally(input);

  // Se já tiver certeza absoluta (ex: marcação explícita de oração ou crise evidente), retorna direto
  if (localResult.confidence >= 0.94) {
    return localResult;
  }

  // Tentar validação profunda com JEV / Supabase Edge Function se houver conexão
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke('care-triage', {
      body: {
        text: `${input.title ? input.title + '\n' : ''}${input.text || ''}`,
        category: input.category,
        is_answered: input.is_answered,
        bible_ref: input.bible_ref,
        mode: 'ecosystem_4pilares',
      },
    });

    if (!error && data && data.pastoral_intent) {
      const validIntents: PastoralIntent[] = [
        'CRISIS',
        'THEOLOGICAL_QUERY',
        'THANKSGIVING',
        'ANSWERED_PRAYER',
      ];

      if (validIntents.includes(data.pastoral_intent)) {
        return {
          intent: data.pastoral_intent as PastoralIntent,
          confidence: typeof data.confidence === 'number' ? data.confidence : 0.9,
          reason: data.reason || 'Classificado pelo motor JEV (TypeSafe AI).',
          biblical_reference: data.biblical_reference || input.bible_ref?.display,
          evaluated_at: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    // Falha silenciosa de rede mantém o resultado local de alta precisão
    console.log('[ClassifierJEV] Fallback local ativado:', err);
  }

  return localResult;
}

/**
 * Avalia se o banner de ação pastoral deve ser exibido na interface:
 * Regra do Produto: confidence >= 0.80 E pastor_status == 'active'.
 */
export function shouldShowPastoralActionBanner(
  classification: PastoralClassificationResult,
  pastorStatus?: string | null
): boolean {
  if (!classification.intent) return false;
  if (classification.confidence < 0.80) return false;
  return pastorStatus === 'active';
}

/**
 * Retorna as cópias canônicas e botões para cada um dos 4 pilares na UI.
 */
export function getPastoralPillCopy(
  intent: PastoralIntent,
  pastorName: string,
  biblicalReference?: string
): PastoralPillCopy {
  const pName = pastorName.trim() || 'seu Pastor';
  const ref = biblicalReference || 'esta passagem';

  switch (intent) {
    case 'CRISIS':
      return {
        title: 'Cuidado & Acolhimento Pastoral',
        prompt: `Percebemos que seu dia está pesado. Quer enviar um sinal discreto de oração para o Pr. ${pName}?`,
        buttonLabel: 'Avisar Pastor',
        iconName: 'heart',
      };

    case 'THEOLOGICAL_QUERY':
      return {
        title: 'Estudo Bíblico & Contexto Profundo',
        prompt: `Esta passagem possui um contexto profundo! Quer enviar uma pergunta de estudo para o Pr. ${pName}?`,
        buttonLabel: 'Tirar Dúvida com Pastor',
        iconName: 'book-open',
      };

    case 'THANKSGIVING':
      return {
        title: 'Ação de Graças & Gratidão',
        prompt: `Deus é fiel! Quer compartilhar essa alegria com o Pr. ${pName}?`,
        buttonLabel: 'Enviar Ação de Graças',
        iconName: 'sun',
      };

    case 'ANSWERED_PRAYER':
      return {
        title: 'Oração Respondida & Celebração',
        prompt: `Deus respondeu sua oração! Quer notificar o Pr. ${pName} para celebrarem juntos?`,
        buttonLabel: 'Compartilhar Testemunho',
        iconName: 'check-circle',
      };
  }
}

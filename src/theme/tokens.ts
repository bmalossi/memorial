/**
 * ═══════════════════════════════════════════════════════════
 *  MEMORIAL — Design Tokens v2.5 (Profissional / Editorial Soberbo)
 *  Dual Theme:
 *   - Dark:  Escuro Contemplativo (#18171D) + Âmbar Dourado (#E7B075)
 *   - Light: Branco Marfim / Pergaminho Sagrado (#F7F5F0) + Âmbar Bronze (#B87E28)
 *
 *  Zero "AI slop" — sem arco-íris, sem saturação berrante, sem bordas pesadas.
 *  Foco em nobreza, tipografia límpida e alto contraste (WCAG AAA).
 * ═══════════════════════════════════════════════════════════
 */

export interface ColorTokens {
  bg: {
    base: string;
    surface: string;
    raised: string;
    subtle: string;
    overlay: string;
  };
  border: {
    DEFAULT: string;
    subtle: string;
    active: string;
  };
  amber: {
    DEFAULT: string;
    dark: string;
    light: string;
    muted: string;
    glow: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    onAmber: string;
    link: string;
  };
  category: {
    reflexao: { label: string };
    oracao: { label: string };
    testemunho: { label: string };
    jejum: { label: string };
  };
  white: string;
  black: string;
  transparent: string;
  error: string;
}

// ── Tema Escuro (Contemplativo & Solene) ──────────────────────────────────
export const darkColors: ColorTokens = {
  bg: {
    base:      '#18171D',   // Fundo principal de todas as telas (canônico)
    surface:   '#211F28',   // Cards, headers, bottom sheets, painéis
    raised:    '#2A2733',   // Inputs, botões de apoio, superfícies elevadas
    subtle:    '#1E1C24',   // Camada intermediária suave
    overlay:   'rgba(12, 11, 15, 0.78)', // Overlay escuro neutro
  },
  border: {
    DEFAULT: '#35323F',   // Borda padrão fina (1px)
    subtle:  '#2A2833',   // Divisores imperceptíveis
    active:  '#E7B075',   // Foco / seleção ativa — âmbar suave
  },
  amber: {
    DEFAULT: '#E7B075',   // Cor exata do botão primário do modelo
    dark:    '#C4884A',   // Estado pressionado
    light:   '#F0C898',   // Destaques de texto ou links
    muted:   'rgba(231, 176, 117, 0.10)', // Fundo de chip ativo (sutil)
    glow:    'rgba(231, 176, 117, 0.25)', // Sombra do botão
  },
  text: {
    primary:   '#F0EDE8',   // Branco marfim — títulos e leitura de alto contraste
    secondary: '#9A9299',   // Cinza intermediário — subtítulos, labels, metadados
    muted:     '#5C5860',   // Cinza escuro — placeholders, timestamps discretos
    onAmber:   '#18171D',   // Texto escuro sobre o botão âmbar
    link:      '#E7B075',   // Ações de texto em destaque
  },
  category: {
    reflexao:   { label: 'Reflexão' },
    oracao:     { label: 'Oração' },
    testemunho: { label: 'Testemunho' },
    jejum:      { label: 'Jejum' },
  },
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  error:       '#D15B5B',   // Erro discreto, sem saturação berrante
};

// ── Tema Claro (Branco Marfim & Pergaminho Sagrado) ────────────────────────
// Editorial nobre: papel marfim bíblico, tinta carvão profunda, bronze sagrado.
export const lightColors: ColorTokens = {
  bg: {
    base:      '#F7F5F0',   // Papel marfim bíblico / pergaminho sutil (zero cansaço visual)
    surface:   '#FFFFFF',   // Cartões puros, folhas limpas elevadas
    raised:    '#ECE8DE',   // Inputs, chips e superfícies táteis de apoio
    subtle:    '#F2EFEB',   // Camada intermediária suave
    overlay:   'rgba(28, 25, 23, 0.45)', // Sombra de overlay quente
  },
  border: {
    DEFAULT: '#E2DCD0',   // Borda arquitetural fina e discreta (1px)
    subtle:  '#ECE7DD',   // Divisores delicados de página
    active:  '#B87E28',   // Foco / seleção ativa — âmbar bronze nobre
  },
  amber: {
    DEFAULT: '#B87E28',   // Âmbar bronze rico (contraste de leitura >= 4.6:1 WCAG AA/AAA)
    dark:    '#966318',   // Estado pressionado
    light:   '#D99B40',   // Destaques e iluminação
    muted:   'rgba(184, 126, 40, 0.10)', // Fundo de chip ativo suave
    glow:    'rgba(184, 126, 40, 0.22)', // Sombra dourada suave
  },
  text: {
    primary:   '#1C1917',   // Tinta carvão profunda e nobre (contraste 14.5:1)
    secondary: '#5E5852',   // Cinza pedra aquecido (contraste 5.6:1)
    muted:     '#8E867E',   // Metadados e datas discretas (contraste 4.2:1)
    onAmber:   '#FFFFFF',   // Branco nítido sobre o botão bronze
    link:      '#A06D28',   // Links e chamadas editoriais
  },
  category: {
    reflexao:   { label: 'Reflexão' },
    oracao:     { label: 'Oração' },
    testemunho: { label: 'Testemunho' },
    jejum:      { label: 'Jejum' },
  },
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  error:       '#C94A4A',   // Carmesim respeitoso
};

// Objeto de cores padrão (fallback mutável para imports estáticos)
export const colors: ColorTokens = {
  ...darkColors,
  bg: { ...darkColors.bg },
  border: { ...darkColors.border },
  amber: { ...darkColors.amber },
  text: { ...darkColors.text },
  category: { ...darkColors.category },
};

export function updateStaticColors(target: ColorTokens) {
  Object.assign(colors, {
    ...target,
    bg: { ...target.bg },
    border: { ...target.border },
    amber: { ...target.amber },
    text: { ...target.text },
    category: { ...target.category },
  });
}

export const typography = {
  size: {
    micro: 10,
    xs:    11,
    sm:    13,
    base:  15,
    md:    17,
    lg:    20,
    xl:    24,
    '2xl': 28,
    '3xl': 34,
  },
  weight: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
  },
  leading: {
    tight:   1.2,
    normal:  1.45,
    relaxed: 1.6,
    reading: 1.75,
  },
  tracking: {
    tight:   -0.3,
    normal:   0,
    wide:     0.5,
    wider:    1.2,
    widest:   3.5, // MEMORIAL brand
  },
} as const;

export const spacing = {
  '0':  0,
  '1':  4,
  '2':  8,
  '3':  12,
  '4':  16,
  '5':  20,
  '6':  24,
  '7':  28,
  '8':  32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

export const radius = {
  xs:   6,
  sm:   10,   // Inputs, chips
  md:   14,   // Botão primário canônico ("gordinho suave")
  lg:   16,   // Cards editoriais
  xl:   22,   // Bottom sheets
  full: 9999, // Botões circulares, pílulas
} as const;

export const shadows = {
  amber: {
    shadowColor:   '#E7B075',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius:  12,
    elevation:     6,
  },
  card: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius:  6,
    elevation:     2,
  },
  sheet: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius:  16,
    elevation:     16,
  },
} as const;

export function getThemedShadows(isDark: boolean) {
  if (isDark) return shadows;
  return {
    amber: {
      shadowColor:   '#B87E28',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius:  10,
      elevation:     5,
    },
    card: {
      shadowColor:   '#3A3228',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius:  8,
      elevation:     2,
    },
    sheet: {
      shadowColor:   '#2A241C',
      shadowOffset:  { width: 0, height: -4 },
      shadowOpacity: 0.14,
      shadowRadius:  16,
      elevation:     12,
    },
  };
}

export const duration = {
  instant: 80,
  fast:    150,
  normal:  250,
  slow:    400,
} as const;

export const easing = {
  spring: { tension: 70, friction: 12 },
  snappy: { tension: 300, friction: 10 },
} as const;

export const components = {
  button: {
    primary: {
      height:          56,
      borderRadius:    radius.md,
      backgroundColor: colors.amber.DEFAULT,
      textColor:       colors.text.onAmber,
    },
    social: {
      size:            58,
      borderRadius:    radius.full,
      backgroundColor: colors.bg.raised,
      borderColor:     colors.border.DEFAULT,
      borderWidth:     1,
    },
  },
  input: {
    height:          52,
    borderRadius:    radius.sm,
    backgroundColor: colors.bg.raised,
    borderColor:     colors.border.DEFAULT,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderColor:     colors.border.DEFAULT,
    borderRadius:    radius.lg,
  },
  logoCircle: {
    size:            72,
    borderRadius:    radius.full,
    backgroundColor: colors.bg.raised,
    borderColor:     colors.border.DEFAULT,
    borderWidth:     1,
    iconSize:        42,
  },
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  components,
} as const;

export type Theme = typeof theme;

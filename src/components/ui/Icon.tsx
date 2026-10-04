/**
 * Icon — Adaptador de ícones para o Memorial
 *
 * Usa @expo/vector-icons (Feather) — já incluído no Expo SDK, sem problemas
 * de resolução Metro. Feather é o projeto pai do Lucide, mesma estética de
 * traço fino e profissional.
 *
 * USO:
 *   import { Icon } from '../../components/ui/Icon';
 *   <Icon name="bookmark" size={20} color={colors.text.secondary} />
 *
 * Nomes disponíveis: https://feathericons.com
 */

import React from 'react';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type FeatherName = ComponentProps<typeof Feather>['name'];

interface IconProps {
  name:        FeatherName;
  size?:       number;
  color?:      string;
  strokeWidth?: number; // não suportado nativamente, mas mantido para compatibilidade de API
}

export function Icon({ name, size = 20, color = '#9A9299' }: IconProps) {
  return <Feather name={name} size={size} color={color} />;
}

// ─── Aliases semânticos para os ícones usados no Memorial ────────────────────
// Mantém a mesma nomenclatura do Lucide para compatibilidade de refatoração.

export const ICON_MAP = {
  // Auth
  mail:       'mail'       as FeatherName,
  lock:       'lock'       as FeatherName,
  eye:        'eye'        as FeatherName,
  eyeOff:     'eye-off'    as FeatherName,
  arrowRight: 'arrow-right'as FeatherName,

  // Navegação
  bookmark:   'bookmark'   as FeatherName,
  bookOpen:   'book-open'  as FeatherName,
  search:     'search'     as FeatherName,
  user:       'user'       as FeatherName,
  plus:       'plus'       as FeatherName,

  // Interação
  x:          'x'          as FeatherName,
  check:      'check'      as FeatherName,
  mic:        'mic'        as FeatherName,
  micOff:     'mic-off'    as FeatherName,
  chevronRight: 'chevron-right' as FeatherName,
} as const;

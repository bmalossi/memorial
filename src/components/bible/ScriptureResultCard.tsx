import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '../../theme';

export interface ScriptureVerseItem {
  verse: number;
  text: string;
}

export interface ScripturePassageData {
  reference: string;
  book_name: string;
  book_slug: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  version: 'acf';
  verses: ScriptureVerseItem[];
}

export interface ScriptureResultCardProps {
  passage: ScripturePassageData;
  confidence?: number;
  onNavigateToPassage?: (bookSlug: string, chapter: number, verse: number) => void;
  onCreateMarco?: (passage: ScripturePassageData) => void;
}

/**
 * ScriptureResultCard — Card de Passagem Bíblica Direta
 *
 * Renderiza exclusivamente o texto sagrado fatiado da Escritura,
 * sem nenhum texto conversacional ou preâmbulo de IA ("No AI Slop").
 * Segue o design editorial nobre do Memorial com suporte integral ao
 * Modo Escuro Contemplativo e ao Modo Claro Pergaminho Sagrado.
 */
export function ScriptureResultCard({
  passage,
  onNavigateToPassage,
  onCreateMarco,
}: ScriptureResultCardProps) {
  const { colors, isDark } = useTheme();

  const handleReadInContext = () => {
    if (onNavigateToPassage) {
      onNavigateToPassage(passage.book_slug, passage.chapter, passage.start_verse);
    }
  };

  const handleCreateMarco = () => {
    if (onCreateMarco) {
      onCreateMarco(passage);
    }
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: colors.bg.surface,
          borderColor: isDark ? 'rgba(231, 176, 117, 0.22)' : 'rgba(184, 126, 40, 0.25)',
        },
      ]}
      accessible={true}
      accessibilityLabel={`Passagem Bíblica: ${passage.reference}`}
    >
      {/* ── Fita Dourada Decorativa de Abertura Contemplativa ── */}
      <View
        style={[
          s.goldenRibbon,
          {
            backgroundColor: colors.amber.DEFAULT,
          },
        ]}
      />

      {/* ── Cabeçalho Nobre com Referência e Badge ACF ── */}
      <View style={s.header}>
        <View style={s.headerMeta}>
          <Text
            style={[
              s.categoryLabel,
              { color: colors.amber.DEFAULT },
            ]}
          >
            PASSAGEM BÍBLICA
          </Text>
          <Text style={[s.referenceTitle, { color: colors.text.primary }]}>
            {passage.reference}
          </Text>
        </View>

        <View
          style={[
            s.versionBadge,
            {
              backgroundColor: isDark ? 'rgba(231, 176, 117, 0.12)' : 'rgba(184, 126, 40, 0.14)',
              borderColor: isDark ? 'rgba(231, 176, 117, 0.3)' : 'rgba(184, 126, 40, 0.35)',
            },
          ]}
        >
          <Text
            style={[
              s.versionBadgeText,
              { color: colors.amber.DEFAULT },
            ]}
          >
            ACF
          </Text>
        </View>
      </View>

      {/* ── Bloco dos Versículos Sagrados (Tipografia Serifada / Zero AI Slop) ── */}
      <View style={s.versesContainer}>
        {passage.verses.map((item) => (
          <View key={item.verse} style={s.verseRow}>
            <Text
              style={[
                s.verseNumber,
                { color: isDark ? colors.amber.light : colors.amber.dark },
              ]}
            >
              {item.verse}
            </Text>
            <Text
              style={[
                s.verseText,
                {
                  color: colors.text.primary,
                  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                },
              ]}
              selectable
            >
              {item.text}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Barra de Ações Canônicas do Memorial ── */}
      <View
        style={[
          s.actionsBar,
          {
            borderTopColor: colors.border.subtle,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            s.secondaryButton,
            {
              backgroundColor: colors.bg.raised,
              borderColor: colors.border.DEFAULT,
            },
          ]}
          onPress={handleReadInContext}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Ler ${passage.reference} no contexto bíblico completo`}
        >
          <Feather name="book-open" size={14} color={colors.text.secondary} />
          <Text style={[s.secondaryButtonText, { color: colors.text.secondary }]}>
            Ler no contexto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.primaryButton,
            {
              backgroundColor: colors.amber.DEFAULT,
            },
          ]}
          onPress={handleCreateMarco}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={`Criar Marco de Fé ancorado em ${passage.reference}`}
        >
          <Feather name="bookmark" size={14} color={colors.text.onAmber} />
          <Text style={[s.primaryButtonText, { color: colors.text.onAmber }]}>
            Criar Marco
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Estilos Editoriais Contemplativos ─────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: spacing['3'],
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  goldenRibbon: {
    height: 3,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['4'],
    paddingBottom: spacing['2'],
  },
  headerMeta: {
    flex: 1,
    paddingRight: spacing['3'],
  },
  categoryLabel: {
    fontSize: typography.size.micro,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.tracking.wider,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  referenceTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.tracking.tight,
  },
  versionBadge: {
    paddingHorizontal: spacing['2'],
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionBadgeText: {
    fontSize: typography.size.micro,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  versesContainer: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['2'],
    paddingBottom: spacing['4'],
    gap: spacing['2'],
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verseNumber: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    marginRight: spacing['2'],
    marginTop: 3,
    minWidth: 16,
    textAlign: 'right',
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: 0.1,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderTopWidth: 1,
    gap: spacing['2'],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['2'],
    paddingHorizontal: spacing['3'],
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['2'],
    paddingHorizontal: spacing['4'],
    borderRadius: radius.sm,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});

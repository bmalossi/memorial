import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  StatusBar,
  Animated,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, colors, ColorTokens, typography, spacing, radius } from '../../theme';
import { MemorialEntry, AiConnection, JevCategory, JEV_CONFIG } from '../../lib/types';
import { CATEGORY_CONFIG, relativeDate } from '../../lib/utils';
import {
  markPrayerAnsweredInSupabase,
  deleteUserMemorial,
} from '../../lib/memorialStore';
import { attachAiConnectionsToMemorial } from '../../lib/aiConnectionService';
import { VisualShareModal, VisualShareData } from '../../components/memorial/VisualShareModal';
import { ActionSheetModal, ActionSheetItem, ConfirmModal } from '../../components/ui';

// ─── Chip de referência bíblica ───────────────────────────────────────────────
function BibleRefChip({ display, onPress }: { display: string; onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, tension: 400, friction: 10 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 10 }).start()
        }
        activeOpacity={0.8}
        style={[
          chip.wrap,
          {
            backgroundColor: colors.amber.muted,
            borderColor: `${colors.amber.DEFAULT}35`,
          },
        ]}
        accessibilityRole="link"
        accessibilityLabel={`Ler ${display}`}
      >
        <Feather name="book-open" size={12} color={colors.amber.DEFAULT} />
        <Text style={[chip.text, { color: colors.amber.DEFAULT }]}>{display}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const chip = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    alignSelf:         'flex-start',
    backgroundColor:   colors.amber.muted,
    borderRadius:      radius.full,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       `${colors.amber.DEFAULT}30`,
  },
  text: {
    color:      colors.amber.DEFAULT,
    fontSize:   typography.size.sm,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.1,
  },
});

// ─── Card de Conexão Bíblica ──────────────────────────────────────────────────
function ConnectionCard({
  connection,
  onReadPassage,
  onSharePassage,
}: {
  connection: AiConnection;
  onReadPassage: (c: AiConnection) => void;
  onSharePassage?: (c: AiConnection) => void;
}) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const jevCfg = connection.jev_category ? JEV_CONFIG[connection.jev_category] : null;

  return (
    <Animated.View style={[conn.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, tension: 350, friction: 12 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 12 }).start()
        }
        style={[conn.card, { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT }]}
        accessibilityRole="none"
        accessibilityLabel={`Conexão bíblica: ${connection.reference}`}
      >
        {/* Cabeçalho do Card: Tag da Categoria JEV & Confiança */}
        <View style={conn.headerRow}>
          {jevCfg ? (
            <View style={conn.jevBadge}>
              <Feather name={jevCfg.icon as any} size={11} color={colors.amber.DEFAULT} />
              <Text style={conn.jevTagText}>{jevCfg.tag}</Text>
            </View>
          ) : (
            <View style={conn.jevBadge}>
              <Feather name="compass" size={11} color={colors.amber.DEFAULT} />
              <Text style={conn.jevTagText}>CONEXÃO</Text>
            </View>
          )}

          {typeof connection.confidence === 'number' && (
            <Text style={conn.confidenceText}>
              {Math.round(connection.confidence * 100)}% ressonância
            </Text>
          )}
        </View>

        {/* Referência Bíblica */}
        <Text style={[conn.reference, { color: colors.amber.DEFAULT }]}>{connection.reference}</Text>

        {/* Divisor */}
        <View style={[conn.divider, { backgroundColor: colors.border.subtle }]} />

        {/* Texto do Versículo */}
        <Text style={[conn.verseText, { color: isDark ? '#E8E3EE' : colors.text.primary }]}>"{connection.verse_text}"</Text>

        {/* Explicação Teológica */}
        <Text style={conn.explanation}>{connection.explanation}</Text>

        {/* Ações: Ler passagem no Leitor & Compartilhar Card Visual */}
        <View style={conn.actionsRow}>
          <TouchableOpacity
            onPress={() => onReadPassage(connection)}
            style={conn.readLink}
            activeOpacity={0.7}
            accessibilityRole="link"
          >
            <Text style={conn.readLinkText}>Ler no contexto bíblico</Text>
            <Feather name="arrow-right" size={13} color={colors.amber.DEFAULT} />
          </TouchableOpacity>

          {onSharePassage && (
            <TouchableOpacity
              onPress={() => onSharePassage(connection)}
              style={conn.shareConnBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Compartilhar conexão ${connection.reference}`}
            >
              <Feather name="share-2" size={12} color={colors.text.secondary} />
              <Text style={conn.shareConnText}>Card Visual</Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const conn = StyleSheet.create({
  wrapper: { width: '100%' },

  card: {
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border.DEFAULT,
    padding:         spacing['5'],
    gap:             spacing['3'],
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.22,
    shadowRadius:    6,
    elevation:       2,
  },

  headerRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent: 'space-between',
    marginBottom:    -2,
  },

  jevBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    backgroundColor:   `${colors.amber.DEFAULT}18`,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.xs,
    borderWidth:       1,
    borderColor:       `${colors.amber.DEFAULT}35`,
  },

  jevTagText: {
    color:         colors.amber.DEFAULT,
    fontSize:      10,
    fontWeight:    typography.weight.bold,
    letterSpacing: 0.8,
  },

  confidenceText: {
    color:      colors.text.muted,
    fontSize:   11,
    fontStyle:  'italic',
  },

  reference: {
    color:         colors.amber.DEFAULT,
    fontSize:      typography.size.base,
    fontWeight:    typography.weight.semibold,
    letterSpacing: 0.1,
  },

  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginVertical:  -2,
  },

  verseText: {
    color:       '#E8E3EE',
    fontSize:    typography.size.sm,
    lineHeight:  typography.size.sm * 1.65,
    fontStyle:   'italic',
    fontFamily:  Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  explanation: {
    color:      colors.text.secondary,
    fontSize:   13,
    lineHeight: 13 * 1.6,
  },

  actionsRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent: 'space-between',
    paddingTop:      spacing['1'],
  },

  readLink: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            5,
  },

  readLinkText: {
    color:      colors.amber.DEFAULT,
    fontSize:   12,
    fontWeight: typography.weight.medium,
  },

  shareConnBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius:    radius.sm,
    backgroundColor: colors.bg.raised,
    borderWidth:     1,
    borderColor:     colors.border.subtle,
  },

  shareConnText: {
    color:      colors.text.secondary,
    fontSize:   11,
    fontWeight: typography.weight.medium,
  },
});

// ─── Estado de processamento IA ───────────────────────────────────────────────
function ProcessingState() {
  return (
    <View style={proc.wrap}>
      <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
      <View style={proc.textWrap}>
        <Text style={proc.title}>Mapeando conexões nas Escrituras…</Text>
        <Text style={proc.subtitle}>
          Identificando passagens correspondentes e ecos bíblicos para este registro.
        </Text>
      </View>
    </View>
  );
}

const proc = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.bg.surface,
    borderRadius:      radius.md,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    paddingHorizontal: spacing['5'],
    paddingVertical:   spacing['4'],
    gap:               14,
  },
  textWrap: {
    flex: 1,
    gap:  2,
  },
  title: {
    color:      colors.text.primary,
    fontSize:   typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    color:      colors.text.muted,
    fontSize:   12,
    lineHeight: 16,
  },
});

// ─── Estado vazio (sem conexões) ──────────────────────────────────────────────
function NoConnectionsState({
  onGenerate,
  isAnalyzing,
}: {
  onGenerate: () => void;
  isAnalyzing: boolean;
}) {
  return (
    <View style={empty.wrap}>
      <View style={empty.iconBadge}>
        <Feather name="compass" size={22} color={colors.amber.DEFAULT} />
      </View>
      <Text style={empty.label}>Descobrir Conexões Bíblicas</Text>
      <Text style={empty.sub}>
        Mapeie passagens correspondentes, promessas e ecos de aliança nas Escrituras relacionados a este memorial.
      </Text>

      <TouchableOpacity
        onPress={onGenerate}
        disabled={isAnalyzing}
        activeOpacity={0.82}
        style={[empty.actionBtn, isAnalyzing && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Mapear conexões bíblicas"
      >
        {isAnalyzing ? (
          <ActivityIndicator size="small" color={colors.text.onAmber} />
        ) : (
          <>
            <Feather name="book-open" size={15} color={colors.text.onAmber} />
            <Text style={empty.actionBtnText}>Mapear conexões nas Escrituras</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: {
    backgroundColor:   colors.bg.surface,
    borderRadius:      radius.lg,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    paddingHorizontal: spacing['5'],
    paddingVertical:   spacing['6'],
    alignItems:        'center',
    gap:               spacing['3'],
  },
  iconBadge: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: colors.bg.raised,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     `${colors.amber.DEFAULT}30`,
  },
  label: {
    color:      colors.text.primary,
    fontSize:   typography.size.base,
    fontWeight: typography.weight.semibold,
    textAlign:  'center',
  },
  sub: {
    color:      colors.text.muted,
    fontSize:   13,
    lineHeight: 20,
    textAlign:  'center',
    maxWidth:   320,
  },
  actionBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    backgroundColor:   colors.amber.DEFAULT,
    paddingHorizontal: spacing['5'],
    paddingVertical:   12,
    borderRadius:      radius.md,
    marginTop:         spacing['2'],
  },
  actionBtnText: {
    color:      colors.text.onAmber,
    fontSize:   14,
    fontWeight: typography.weight.bold,
  },
});

// ─── Header da tela ───────────────────────────────────────────────────────────
function ScreenHeader({
  onBack,
  onShare,
  onMore,
}: {
  onBack: () => void;
  onShare: () => void;
  onMore: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[hdr.row, { backgroundColor: colors.bg.surface, borderBottomColor: colors.border.DEFAULT }]}>
      <TouchableOpacity
        onPress={onBack}
        style={hdr.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="chevron-left" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <Text style={[hdr.title, { color: colors.text.primary }]} accessibilityRole="header">
        MARCO DE FÉ
      </Text>

      <View style={hdr.rightGroup}>
        <TouchableOpacity
          onPress={onShare}
          style={hdr.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar card visual"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="share-2" size={18} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onMore}
          style={hdr.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Mais opções"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="more-horizontal" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const hdr = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing['4'],
    paddingVertical:   spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
  },
  iconBtn: {
    width:           36,
    height:          36,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    radius.sm,
  },
  title: {
    fontSize:      12,
    fontWeight:    typography.weight.bold,
    letterSpacing: 2.5,
    fontFamily:    Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
});

// ─── Botão Oração Respondida ──────────────────────────────────────────────────
function AnsweredPrayerButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 10 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 10 }).start()
        }
        activeOpacity={0.8}
        style={[
          ans.btn,
          {
            backgroundColor: colors.bg.surface,
            borderColor: colors.border.DEFAULT,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Registrar oração como respondida"
      >
        <Feather name="check" size={16} color={colors.amber.DEFAULT} />
        <Text style={[ans.text, { color: colors.text.secondary }]}>
          Registrar como oração respondida
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const ans = StyleSheet.create({
  btn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               spacing['2'],
    borderRadius:      radius.md,
    borderWidth:       1,
    paddingVertical:   14,
    marginTop:         spacing['2'],
  },
  text: {
    fontSize:   typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});

// ─── MarcoDetalheScreen ───────────────────────────────────────────────────────
interface Props {
  navigation?: any;
  route?: { params?: { entry?: MemorialEntry } };
}

// Mock para visualização quando não há entry via route
const MOCK_ENTRY: MemorialEntry = {
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
      verse_text:
        'O meu Deus, segundo as suas riquezas em glória, suprirá todas as vossas necessidades em Cristo Jesus.',
      explanation:
        'A provisão sobrenatural que você vivenciou é exatamente o que Paulo descreve: Deus suprindo segundo suas riquezas em glória, de forma concreta e perceptível.',
      book_slug: 'fp', chapter: 4, verse: 19,
    },
    {
      reference: 'Salmos 23:5',
      verse_text:
        'Preparas uma mesa perante mim na presença dos meus adversários; unges a minha cabeça com óleo; o meu cálice transborda.',
      explanation:
        'A imagem do cálice que transborda captura exatamente a sua experiência: não apenas o suficiente, mas abundância visível mesmo diante das dificuldades.',
      book_slug: 'sl', chapter: 23, verse: 5,
    },
    {
      reference: 'Deuteronômio 8:3',
      verse_text:
        'E te humilhou, e te deixou ter fome, e te sustentou com o maná… para te fazer saber que o homem não viverá só de pão, mas de tudo o que sai da boca do Senhor.',
      explanation:
        'O período de dificuldade precedeu a provisão — padrão idêntico ao que você vivenciou, mostrando que a dependência de Deus precede o milagre.',
      book_slug: 'dt', chapter: 8, verse: 3,
    },
  ],
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 12).toISOString(),
};

export function MarcoDetalheScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [currentEntry, setCurrentEntry] = useState<MemorialEntry>(
    route?.params?.entry ?? MOCK_ENTRY
  );
  const [isAnalyzingConnections, setIsAnalyzingConnections] = useState(false);
  const [visualShareVisible, setVisualShareVisible] = useState(false);
  const [visualShareData, setVisualShareData] = useState<VisualShareData | null>(null);

  // Modais Editoriais (Zero Alert.alert genérico)
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [answerConfirmVisible, setAnswerConfirmVisible] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: keyof typeof Feather.glyphMap;
    destructive?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const cfg = CATEGORY_CONFIG[currentEntry.category];
  const s = useMemo(() => getMarcoStyles(colors, isDark), [colors, isDark]);

  const handleBack = () => navigation?.goBack?.();

  const handleOpenVisualShare = () => {
    setVisualShareData({
      title: currentEntry.title,
      content: currentEntry.content,
      category: currentEntry.category,
      bibleRefDisplay: currentEntry.bible_ref?.display,
      bibleVerseText: currentEntry.ai_connections?.[0]?.verse_text,
      date: currentEntry.created_at,
    });
    setVisualShareVisible(true);
  };

  const handleShareConnection = (c: AiConnection) => {
    setVisualShareData({
      title: c.reference,
      content: c.verse_text,
      bibleRefDisplay: c.reference,
      authorOrSource: c.explanation,
      category: currentEntry.category,
      date: currentEntry.created_at,
    });
    setVisualShareVisible(true);
  };

  const handleGenerateConnections = async () => {
    if (!currentEntry.content || !currentEntry.content.trim()) {
      setInfoModal({
        visible: true,
        title: 'Relato Vazio',
        message: 'Adicione conteúdo ao relato para mapear conexões bíblicas.',
        icon: 'edit-3',
      });
      return;
    }

    setIsAnalyzingConnections(true);
    try {
      const updated = await attachAiConnectionsToMemorial(currentEntry.id, currentEntry);
      setCurrentEntry(updated);
    } catch (err: any) {
      setInfoModal({
        visible: true,
        title: 'Conexões Bíblicas',
        message: err?.message || 'Não foi possível mapear conexões no momento.',
        icon: 'compass',
      });
    } finally {
      setIsAnalyzingConnections(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteUserMemorial(currentEntry.id);
      setDeleteConfirmVisible(false);
      navigation?.goBack?.();
    } catch (err: any) {
      setDeleteConfirmVisible(false);
      setInfoModal({
        visible: true,
        title: 'Erro ao Excluir',
        message: err?.message || 'Não foi possível excluir o marco de fé.',
        icon: 'alert-circle',
        destructive: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmAnswered = async () => {
    setIsAnswering(true);
    try {
      await markPrayerAnsweredInSupabase(currentEntry.id);
      setCurrentEntry((prev) => ({
        ...prev,
        is_answered: true,
        answered_at: new Date().toISOString(),
      }));
      setAnswerConfirmVisible(false);
      setInfoModal({
        visible: true,
        title: 'Glória a Deus!',
        message: 'Esta oração foi registrada como respondida. O Senhor é fiel!',
        icon: 'check-circle',
      });
    } catch (err: any) {
      setAnswerConfirmVisible(false);
      setInfoModal({
        visible: true,
        title: 'Erro ao Atualizar',
        message: 'Não foi possível atualizar o marco na nuvem. Verifique sua conexão com a internet.',
        icon: 'alert-circle',
        destructive: true,
      });
    } finally {
      setIsAnswering(false);
    }
  };

  const handleShare = async () => {
    try {
      const text = [
        currentEntry.title ? `"${currentEntry.title}"` : '',
        '',
        currentEntry.content,
        '',
        currentEntry.bible_ref ? `— ${currentEntry.bible_ref.display}` : '',
        '',
        'Registrado no app Memorial',
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({ message: text });
    } catch {}
  };

  const actionMenuItems: ActionSheetItem[] = [
    {
      id: 'connections',
      label: isAnalyzingConnections ? 'Mapeando Conexões…' : 'Mapear Conexões Bíblicas',
      description: 'Identificar ressonâncias e versículos com IA teológica',
      icon: 'compass',
      variant: 'accent',
      disabled: isAnalyzingConnections,
      onPress: handleGenerateConnections,
    },
    {
      id: 'visual-share',
      label: 'Compartilhar Card Visual',
      description: 'Gerar imagem editorial para Instagram, WhatsApp e stories',
      icon: 'image',
      onPress: handleOpenVisualShare,
    },
    {
      id: 'text-share',
      label: 'Compartilhar Texto Simples',
      description: 'Copiar ou encaminhar relato e referências em texto',
      icon: 'share-2',
      onPress: handleShare,
    },
    {
      id: 'delete',
      label: 'Excluir Marco de Fé',
      description: 'Remover este registro permanentemente da Linha Sagrada',
      icon: 'trash-2',
      variant: 'destructive',
      onPress: () => setDeleteConfirmVisible(true),
    },
  ];

  const handleReadPassage = (connection: AiConnection) => {
    navigation?.navigate?.('Main', {
      screen: 'Biblia',
      params: {
        book_slug: connection.book_slug,
        chapter:   connection.chapter,
        verse:     connection.verse,
        highlight_source: 'conexao',
        connection_explanation: connection.explanation,
        marco_title: currentEntry.title || CATEGORY_CONFIG[currentEntry.category]?.label,
      },
    });
  };

  const handleBibleRefPress = () => {
    if (currentEntry.bible_ref) {
      navigation?.navigate?.('Main', {
        screen: 'Biblia',
        params: {
          book_slug: currentEntry.bible_ref.slug,
          chapter:   currentEntry.bible_ref.chapter,
          verse:     currentEntry.bible_ref.verse,
          highlight_source: 'marco',
          marco_title: currentEntry.title || CATEGORY_CONFIG[currentEntry.category]?.label,
        },
      });
    }
  };

  const handleMore = () => {
    setActionMenuVisible(true);
  };

  const handleMarkAnswered = () => {
    setAnswerConfirmVisible(true);
  };

  const hasConnections =
    Array.isArray(currentEntry.ai_connections) &&
    currentEntry.ai_connections.length > 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.surface}
      />

      <ScreenHeader
        onBack={handleBack}
        onShare={handleOpenVisualShare}
        onMore={handleMore}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + spacing['8'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cabeçalho do registro ── */}
        <View style={s.entryHeader}>
          <View style={s.metaRow}>
            <Text style={s.categoryLabel}>{cfg.tag}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.dateText}>{relativeDate(currentEntry.created_at)}</Text>
          </View>

          {currentEntry.title ? (
            <Text style={s.title}>{currentEntry.title}</Text>
          ) : null}

          {currentEntry.bible_ref ? (
            <BibleRefChip
              display={currentEntry.bible_ref.display}
              onPress={handleBibleRefPress}
            />
          ) : null}
        </View>

        {/* ── Conteúdo ── */}
        <View style={s.contentBlock}>
          <Text style={s.body}>{currentEntry.content}</Text>
        </View>

        {/* ── Tags ── */}
        {(currentEntry.tags?.length ?? 0) > 0 && (
          <View style={s.tagsRow}>
            {currentEntry.tags!.map((tag) => (
              <View key={tag} style={s.tagChip}>
                <Text style={s.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Divisor ── */}
        <View style={s.sectionDivider} />

        {/* ── Conexões Bíblicas ── */}
        <View style={s.connectionsSection}>
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionLine} />
            <Text style={s.sectionTitle}>CONEXÕES BÍBLICAS</Text>
            <View style={s.sectionLine} />
            {hasConnections && (
              <TouchableOpacity
                onPress={handleGenerateConnections}
                disabled={isAnalyzingConnections}
                style={s.refreshBtn}
                accessibilityRole="button"
                accessibilityLabel="Atualizar conexões bíblicas"
              >
                <Feather name="refresh-cw" size={11} color={colors.amber.DEFAULT} />
                <Text style={s.refreshText}>Atualizar</Text>
              </TouchableOpacity>
            )}
          </View>

          {(currentEntry.ai_status === 'processing' || isAnalyzingConnections) && (
            <ProcessingState />
          )}

          {!isAnalyzingConnections && currentEntry.ai_status !== 'processing' && (
            <>
              {!hasConnections ? (
                <NoConnectionsState
                  onGenerate={handleGenerateConnections}
                  isAnalyzing={isAnalyzingConnections}
                />
              ) : (
                <View style={s.connectionsList}>
                  {currentEntry.ai_connections!.map((c, i) => (
                    <ConnectionCard
                      key={`${c.book_slug}-${c.chapter}-${c.verse}-${i}`}
                      connection={c}
                      onReadPassage={handleReadPassage}
                      onSharePassage={handleShareConnection}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Oração respondida ── */}
        {currentEntry.category === 'oracao' && !currentEntry.is_answered && (
          <AnsweredPrayerButton onPress={handleMarkAnswered} />
        )}

        {/* ── Badge "respondida" se já for ── */}
        {currentEntry.category === 'oracao' && currentEntry.is_answered && (
          <View style={s.answeredBadge}>
            <Feather name="check-circle" size={14} color={colors.text.secondary} />
            <Text style={s.answeredText}>
              Oração respondida{currentEntry.answered_at ? ` · ${relativeDate(currentEntry.answered_at)}` : ''}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Modal de Compartilhamento Visual Editorial ── */}
      {visualShareData && (
        <VisualShareModal
          visible={visualShareVisible}
          onClose={() => setVisualShareVisible(false)}
          data={visualShareData}
        />
      )}

      {/* ── Menu de Ações Editorial (Substituto dos 3 pontinhos / Alert nativo) ── */}
      <ActionSheetModal
        visible={actionMenuVisible}
        onClose={() => setActionMenuVisible(false)}
        title="MARCO DE FÉ"
        subtitle="Ações espirituais e opções para este registro"
        items={actionMenuItems}
      />

      {/* ── Confirmação de Exclusão Editorial ── */}
      <ConfirmModal
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title="Excluir Marco de Fé"
        message="Tem certeza que deseja excluir permanentemente este marco? Esta experiência será removida da Linha Sagrada."
        icon="trash-2"
        confirmLabel="Excluir Marco"
        cancelLabel="Cancelar"
        destructive
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Confirmação de Oração Respondida ── */}
      <ConfirmModal
        visible={answerConfirmVisible}
        onClose={() => setAnswerConfirmVisible(false)}
        title="Registrar Resposta"
        message="Deseja registrar esta oração como respondida pelo Senhor e celebrar este testemunho de fidelidade?"
        icon="check-circle"
        confirmLabel="Confirmar Resposta"
        cancelLabel="Aguardando"
        loading={isAnswering}
        onConfirm={handleConfirmAnswered}
      />

      {/* ── Feedback Informativo Editorial ── */}
      <ConfirmModal
        visible={infoModal.visible}
        onClose={() => setInfoModal((prev) => ({ ...prev, visible: false }))}
        title={infoModal.title}
        message={infoModal.message}
        icon={infoModal.icon || 'info'}
        confirmLabel="Entendido"
        cancelLabel=""
        destructive={infoModal.destructive}
        onConfirm={() => setInfoModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
function getMarcoStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg.base,
  },

  scroll: { flex: 1 },

  scrollContent: {
    paddingHorizontal: spacing['5'],
    paddingTop:        spacing['5'],
    gap:               spacing['4'],
  },

  // ── Cabeçalho do registro
  entryHeader: {
    gap: spacing['3'],
  },

  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing['2'],
  },

  categoryLabel: {
    color:         colors.text.secondary,
    fontSize:      11,
    fontWeight:    typography.weight.bold,
    letterSpacing: 1.4,
  },

  dot: {
    color:    colors.text.muted,
    fontSize: 12,
  },

  dateText: {
    color:    colors.text.muted,
    fontSize: 12,
  },

  title: {
    color:         colors.text.primary,
    fontSize:      26,
    fontWeight:    typography.weight.bold,
    fontFamily:    Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight:    34,
    letterSpacing: typography.tracking.tight,
  },

  // ── Conteúdo
  contentBlock: {
    paddingTop: spacing['1'],
  },

  body: {
    color:      isDark ? '#D4CFDA' : colors.text.primary,
    fontSize:   16,
    lineHeight: 26,
  },

  // ── Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing['2'],
  },

  tagChip: {
    backgroundColor:   colors.bg.raised,
    borderRadius:      6,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderWidth:       1,
    borderColor:       colors.border.subtle,
  },

  tagText: {
    color:    colors.text.muted,
    fontSize: 12,
  },

  // ── Divisor de seção
  sectionDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: colors.border.DEFAULT,
    marginVertical:  spacing['2'],
  },

  // ── Conexões Bíblicas
  connectionsSection: {
    gap: spacing['4'],
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing['3'],
  },

  sectionLine: {
    flex:            1,
    height:          StyleSheet.hairlineWidth,
    backgroundColor: colors.border.DEFAULT,
  },

  sectionTitle: {
    color:         colors.text.muted,
    fontSize:      10,
    fontWeight:    typography.weight.bold,
    letterSpacing: 1.8,
  },

  refreshBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.xs,
    backgroundColor:   colors.bg.raised,
    borderWidth:       1,
    borderColor:       `${colors.amber.DEFAULT}35`,
  },

  refreshText: {
    color:      colors.amber.DEFAULT,
    fontSize:   11,
    fontWeight: typography.weight.medium,
  },

  connectionsList: {
    gap: spacing['3'],
  },

  // ── Oração respondida badge
  answeredBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               spacing['2'],
    paddingVertical:   14,
    backgroundColor:   colors.bg.surface,
    borderRadius:      radius.md,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
  },

  answeredText: {
    color:      colors.text.secondary,
    fontSize:   typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});
}

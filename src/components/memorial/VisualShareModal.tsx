import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';
import { MemorialCategory } from '../../lib/supabase';
import { CATEGORY_CONFIG } from '../../lib/utils';
import { ConfirmModal } from '../ui';

export type AspectRatioType = 'story' | 'feed' | 'square';
export type ThemeStyleType = 'obsidiana' | 'crepusculo' | 'nocturne' | 'pergaminho';

export interface VisualShareData {
  title?: string;
  content: string;
  category?: MemorialCategory;
  bibleRefDisplay?: string;
  bibleVerseText?: string;
  date?: string;
  authorOrSource?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  data: VisualShareData;
}

interface ThemePalette {
  bg: string;
  frameBorder: string;
  cornerMark: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  topBadgeBg: string;
}

const THEMES: Record<ThemeStyleType, { label: string; palette: ThemePalette }> = {
  obsidiana: {
    label: 'Obsidiana',
    palette: {
      bg: '#141318',
      frameBorder: 'rgba(231, 176, 117, 0.22)',
      cornerMark: '#E7B075',
      textPrimary: '#F4F1EA',
      textSecondary: '#A39C96',
      textMuted: '#6B6661',
      accent: '#E7B075',
      topBadgeBg: 'rgba(231, 176, 117, 0.08)',
    },
  },
  crepusculo: {
    label: 'Crepúsculo',
    palette: {
      bg: '#1D1917',
      frameBorder: 'rgba(214, 185, 148, 0.24)',
      cornerMark: '#D6B994',
      textPrimary: '#F7F4EF',
      textSecondary: '#ABA298',
      textMuted: '#736B63',
      accent: '#D6B994',
      topBadgeBg: 'rgba(214, 185, 148, 0.08)',
    },
  },
  nocturne: {
    label: 'Nocturne',
    palette: {
      bg: '#0B0A0D',
      frameBorder: 'rgba(255, 255, 255, 0.10)',
      cornerMark: '#8C8896',
      textPrimary: '#FFFFFF',
      textSecondary: '#8C8896',
      textMuted: '#524E5C',
      accent: '#E7B075',
      topBadgeBg: 'rgba(255, 255, 255, 0.04)',
    },
  },
  pergaminho: {
    label: 'Pergaminho',
    palette: {
      bg: '#F7F5F0',
      frameBorder: 'rgba(184, 126, 40, 0.28)',
      cornerMark: '#B87E28',
      textPrimary: '#1C1917',
      textSecondary: '#5E5852',
      textMuted: '#8E867E',
      accent: '#B87E28',
      topBadgeBg: 'rgba(184, 126, 40, 0.10)',
    },
  },
};

function formatShareDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export function VisualShareModal({ visible, onClose, data }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const cardRef = useRef<View>(null);

  const [aspect, setAspect] = useState<AspectRatioType>('story');
  const [themeStyle, setThemeStyle] = useState<ThemeStyleType>(isDark ? 'pergaminho' : 'obsidiana');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Modal Editorial de Alerta / Fallback
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: keyof typeof Feather.glyphMap;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    destructive?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const s = useMemo(() => getShareModalStyles(colors, isDark), [colors, isDark]);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Dimensões do preview na tela
  const cardWidth = Math.min(screenWidth - 48, 330);
  let cardHeight = cardWidth;
  if (aspect === 'story') {
    cardHeight = Math.min(Math.round((cardWidth * 16) / 9), screenHeight * 0.52);
  } else if (aspect === 'feed') {
    cardHeight = Math.round((cardWidth * 5) / 4);
  } else {
    cardHeight = cardWidth;
  }

  const currentTheme = THEMES[themeStyle].palette;
  const categoryLabel = data.category ? CATEGORY_CONFIG[data.category as MemorialCategory]?.tag : undefined;
  const formattedDate = formatShareDate(data.date);

  // Ajuste fino do tamanho de fonte baseado no comprimento do texto e no aspect ratio
  const contentLength = data.content.length;
  let dynamicFontSize = 17;
  let dynamicLineHeight = 27;

  if (aspect === 'square') {
    if (contentLength > 200) {
      dynamicFontSize = 13;
      dynamicLineHeight = 19;
    } else if (contentLength > 120) {
      dynamicFontSize = 14;
      dynamicLineHeight = 22;
    } else {
      dynamicFontSize = 16;
      dynamicLineHeight = 25;
    }
  } else if (aspect === 'feed') {
    if (contentLength > 250) {
      dynamicFontSize = 13.5;
      dynamicLineHeight = 21;
    } else if (contentLength > 140) {
      dynamicFontSize = 15;
      dynamicLineHeight = 24;
    } else {
      dynamicFontSize = 17.5;
      dynamicLineHeight = 28;
    }
  } else {
    // story (9:16)
    if (contentLength > 320) {
      dynamicFontSize = 14;
      dynamicLineHeight = 22;
    } else if (contentLength > 180) {
      dynamicFontSize = 15.5;
      dynamicLineHeight = 25;
    } else {
      dynamicFontSize = 18;
      dynamicLineHeight = 29;
    }
  }

  const formattedShareText = [
    data.title ? `"${data.title}"` : '',
    '',
    `"${data.content}"`,
    '',
    data.bibleRefDisplay ? `— ${data.bibleRefDisplay}` : '',
    data.bibleVerseText ? `\n"${data.bibleVerseText}"` : '',
    '',
    'Registrado no App Memorial',
  ]
    .filter(Boolean)
    .join('\n');

  const handleShareImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: Math.round(cardWidth * 3),
        height: Math.round(cardHeight * 3),
        result: 'tmpfile',
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartilhar Marco de Fé',
          UTI: 'public.png',
        });
      } else {
        // Fallback para compartilhamento nativo de texto caso compartilhamento de arquivo não seja suportado
        await Share.share({ message: formattedShareText });
      }
    } catch (err: any) {
      console.warn('Erro ao compartilhar imagem do card:', err);
      setConfirmDialog({
        visible: true,
        title: 'Compartilhar Texto',
        message: 'Não foi possível gerar a imagem no dispositivo. Deseja compartilhar como texto simples?',
        icon: 'share-2',
        confirmLabel: 'Compartilhar Texto',
        cancelLabel: 'Cancelar',
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
          Share.share({ message: formattedShareText });
        },
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(formattedShareText);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2400);
    } catch {
      setConfirmDialog({
        visible: true,
        title: 'Área de Transferência',
        message: 'Não foi possível copiar o texto.',
        icon: 'alert-circle',
        confirmLabel: 'Entendido',
        cancelLabel: '',
        destructive: true,
      });
    }
  };

  const handleShareTextOnly = async () => {
    try {
      await Share.share({ message: formattedShareText });
    } catch {}
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>COMPARTILHAR VISUAL</Text>
              <Text style={s.headerSubtitle}>Design editorial para redes e mensagens</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={s.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar visualizador"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {/* ── CARD VISUAL EDITORIAL (Capturado pelo ViewShot) ── */}
            <View style={s.previewWrapper}>
              <View
                ref={cardRef}
                collapsable={false}
                style={[
                  s.cardRoot,
                  {
                    width: cardWidth,
                    height: cardHeight,
                    backgroundColor: currentTheme.bg,
                  },
                ]}
              >
                {/* Moldura Interna em Hairline */}
                <View
                  style={[
                    s.cardInnerFrame,
                    {
                      borderColor: currentTheme.frameBorder,
                    },
                  ]}
                >
                  {/* Quatro Cantoneiras Clássicas (Ornamentais) */}
                  <Text style={[s.cornerMark, s.cornerTL, { color: currentTheme.cornerMark }]}>✦</Text>
                  <Text style={[s.cornerMark, s.cornerTR, { color: currentTheme.cornerMark }]}>✦</Text>
                  <Text style={[s.cornerMark, s.cornerBL, { color: currentTheme.cornerMark }]}>✦</Text>
                  <Text style={[s.cornerMark, s.cornerBR, { color: currentTheme.cornerMark }]}>✦</Text>

                  {/* Topo do Card: Monograma Memorial & Categoria */}
                  <View style={s.cardTopRow}>
                    <View style={s.brandGroup}>
                      <Text style={[s.brandMonogram, { color: currentTheme.accent }]}>
                        M E M O R I A L
                      </Text>
                      {categoryLabel ? (
                        <Text style={[s.categorySub, { color: currentTheme.textSecondary }]}>
                          • {categoryLabel}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Corpo Central: Citação Sagrada / Marco */}
                  <View style={s.cardBody}>
                    {/* Título do Marco (se houver) */}
                    {data.title ? (
                      <Text
                        style={[s.cardTitle, { color: currentTheme.textPrimary }]}
                        numberOfLines={2}
                      >
                        {data.title}
                      </Text>
                    ) : null}

                    {/* Texto Principal (Relato ou Versículo) */}
                    <Text
                      style={[
                        s.cardContentText,
                        {
                          color: currentTheme.textPrimary,
                          fontSize: dynamicFontSize,
                          lineHeight: dynamicLineHeight,
                        },
                      ]}
                      numberOfLines={aspect === 'square' ? 7 : 11}
                    >
                      “{data.content}”
                    </Text>

                    {/* Referência Bíblica Ancorada */}
                    {data.bibleRefDisplay ? (
                      <View style={s.bibleRefGroup}>
                        <View style={[s.refDivider, { backgroundColor: currentTheme.frameBorder }]} />
                        <Text style={[s.bibleRefText, { color: currentTheme.accent }]}>
                          {data.bibleRefDisplay.toUpperCase()}
                        </Text>
                        {data.bibleVerseText ? (
                          <Text
                            style={[s.bibleVerseQuote, { color: currentTheme.textSecondary }]}
                            numberOfLines={2}
                          >
                            “{data.bibleVerseText}”
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>

                  {/* Rodapé do Card: Data e Lema Sagrado */}
                  <View style={s.cardFooter}>
                    {formattedDate ? (
                      <Text style={[s.footerDate, { color: currentTheme.textMuted }]}>
                        {formattedDate}
                      </Text>
                    ) : (
                      <View />
                    )}

                    <Text style={[s.footerMotto, { color: currentTheme.textMuted }]}>
                      Guarda o que tens visto
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Toast de Cópia */}
            {copiedToast && (
              <View style={s.toastPill}>
                <Feather name="check" size={13} color={colors.amber.DEFAULT} />
                <Text style={s.toastText}>Citação copiada para a área de transferência</Text>
              </View>
            )}

            {/* ── Controles de Proporção (Aspect Ratio) ── */}
            <View style={s.controlSection}>
              <Text style={s.controlLabel}>FORMATO</Text>
              <View style={s.pillsRow}>
                <TouchableOpacity
                  onPress={() => setAspect('story')}
                  style={[s.pillBtn, aspect === 'story' && s.pillBtnActive]}
                  activeOpacity={0.75}
                >
                  <Feather
                    name="smartphone"
                    size={13}
                    color={aspect === 'story' ? colors.text.onAmber : colors.text.secondary}
                  />
                  <Text style={[s.pillText, aspect === 'story' && s.pillTextActive]}>
                    Story (9:16)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAspect('feed')}
                  style={[s.pillBtn, aspect === 'feed' && s.pillBtnActive]}
                  activeOpacity={0.75}
                >
                  <Feather
                    name="image"
                    size={13}
                    color={aspect === 'feed' ? colors.text.onAmber : colors.text.secondary}
                  />
                  <Text style={[s.pillText, aspect === 'feed' && s.pillTextActive]}>
                    Feed (4:5)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAspect('square')}
                  style={[s.pillBtn, aspect === 'square' && s.pillBtnActive]}
                  activeOpacity={0.75}
                >
                  <Feather
                    name="square"
                    size={13}
                    color={aspect === 'square' ? colors.text.onAmber : colors.text.secondary}
                  />
                  <Text style={[s.pillText, aspect === 'square' && s.pillTextActive]}>
                    Quadrado (1:1)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Controles de Estilo / Tema ── */}
            <View style={s.controlSection}>
              <Text style={s.controlLabel}>ESTILO EDITORIAL</Text>
              <View style={s.pillsRow}>
                {(Object.keys(THEMES) as ThemeStyleType[]).map((key) => {
                  const isActive = themeStyle === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setThemeStyle(key)}
                      style={[s.pillBtn, isActive && s.pillBtnActive]}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          s.themeIndicatorDot,
                          { backgroundColor: THEMES[key].palette.bg, borderColor: THEMES[key].palette.accent },
                        ]}
                      />
                      <Text style={[s.pillText, isActive && s.pillTextActive]}>
                        {THEMES[key].label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* ── Botões de Ação na Base ── */}
          <View style={s.actionRow}>
            {/* Botão Copiar */}
            <TouchableOpacity
              onPress={handleCopyText}
              style={s.secondaryActionBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Copiar texto"
            >
              <Feather name="copy" size={16} color={colors.text.primary} />
              <Text style={s.secondaryActionText}>Copiar</Text>
            </TouchableOpacity>

            {/* Botão Texto Simples */}
            <TouchableOpacity
              onPress={handleShareTextOnly}
              style={s.secondaryActionBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar texto"
            >
              <Feather name="message-square" size={16} color={colors.text.primary} />
              <Text style={s.secondaryActionText}>Texto</Text>
            </TouchableOpacity>

            {/* Botão Primário: Compartilhar Imagem */}
            <TouchableOpacity
              onPress={handleShareImage}
              disabled={isExporting}
              style={s.primaryActionBtn}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar imagem"
            >
              {isExporting ? (
                <ActivityIndicator color={colors.text.onAmber} size="small" />
              ) : (
                <>
                  <Feather name="share-2" size={16} color={colors.text.onAmber} />
                  <Text style={s.primaryActionText}>Compartilhar Imagem</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal Editorial de Diálogo / Confirmação */}
    <ConfirmModal
      visible={confirmDialog.visible}
      onClose={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
      title={confirmDialog.title}
      message={confirmDialog.message}
      icon={confirmDialog.icon || 'share-2'}
      confirmLabel={confirmDialog.confirmLabel || 'Entendido'}
      cancelLabel={confirmDialog.cancelLabel || ''}
      destructive={confirmDialog.destructive}
      onConfirm={() => {
        const action = confirmDialog.onConfirm;
        setConfirmDialog((prev) => ({ ...prev, visible: false }));
        if (action) action();
      }}
    />
  </>
  );
}

function getShareModalStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(10, 9, 12, 0.85)' : 'rgba(28, 25, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border.DEFAULT,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['4'],
    paddingBottom: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerSubtitle: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['4'],
    paddingBottom: spacing['4'],
    alignItems: 'center',
  },
  previewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['4'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },

  /* Estilos do Card Imprimível/Exportável */
  cardRoot: {
    borderRadius: 8,
    overflow: 'hidden',
    padding: 12,
  },
  cardInnerFrame: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cornerMark: {
    position: 'absolute',
    fontSize: 9,
    opacity: 0.85,
  },
  cornerTL: { top: 4, left: 6 },
  cornerTR: { top: 4, right: 6 },
  cornerBL: { bottom: 4, left: 6 },
  cornerBR: { bottom: 4, right: 6 },

  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandMonogram: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  categorySub: {
    fontSize: 9,
    fontWeight: typography.weight.medium,
    letterSpacing: 1.5,
  },

  cardBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  cardTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 17,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  cardContentText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bibleRefGroup: {
    alignItems: 'center',
    marginTop: 14,
    width: '100%',
  },
  refDivider: {
    width: 28,
    height: 1,
    marginBottom: 10,
  },
  bibleRefText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
  },
  bibleVerseQuote: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerDate: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  footerMotto: {
    fontSize: 9,
    letterSpacing: 1,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  /* Toasts e Controles */
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg.raised,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.amber.DEFAULT}35`,
    marginBottom: spacing['3'],
  },
  toastText: {
    color: colors.amber.DEFAULT,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },

  controlSection: {
    width: '100%',
    marginBottom: spacing['3'],
  },
  controlLabel: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bg.raised,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  pillBtnActive: {
    backgroundColor: colors.amber.DEFAULT,
    borderColor: colors.amber.DEFAULT,
  },
  pillText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
  pillTextActive: {
    color: colors.text.onAmber,
    fontWeight: typography.weight.bold,
  },
  themeIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['3'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.DEFAULT,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bg.raised,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  secondaryActionText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: typography.weight.medium,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.amber.DEFAULT,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  primaryActionText: {
    color: colors.text.onAmber,
    fontSize: 14,
    fontWeight: typography.weight.bold,
  },
});
}

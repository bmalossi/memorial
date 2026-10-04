import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius, getThemedShadows } from '../../theme';
import {
  BIBLE_BOOKS,
  BibleChapterData,
  BibleBookInfo,
  loadBibleChapter,
  findBook,
} from '../../lib/bibleData';
import { BookPickerModal } from '../../components/bible/BookPickerModal';
import { NovoRegistroSheet } from '../../components/memorial/NovoRegistroSheet';
import { MemorialEntry } from '../../lib/types';
import { saveUserMemorial } from '../../lib/memorialStore';
import { attachAiConnectionsToMemorial } from '../../lib/aiConnectionService';
import { VisualShareModal, VisualShareData } from '../../components/memorial/VisualShareModal';
import { ConfirmModal } from '../../components/ui';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      book_slug?: string;
      chapter?: number;
      verse?: number;
      highlight_source?: 'conexao' | 'marco';
      connection_explanation?: string;
      marco_title?: string;
    };
  };
}

export function BibliaScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getBibliaStyles(colors, isDark), [colors, isDark]);

  // Referência do ScrollView e mapa de posições dos versículos
  const scrollViewRef = useRef<ScrollView>(null);
  const versePositionsRef = useRef<Record<number, number>>({});

  // Estado do Livro e Capítulo atual
  const [currentBookSlug, setCurrentBookSlug] = useState('sl');
  const [currentChapter, setCurrentChapter] = useState(23);
  const [chapterData, setChapterData] = useState<BibleChapterData | null>(null);
  const [loading, setLoading] = useState(true);

  // Seleção e Destaque de versículo
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null);
  const [highlightSource, setHighlightSource] = useState<'conexao' | 'marco' | null>(null);
  const [connectionExplanation, setConnectionExplanation] = useState<string | null>(null);
  const [marcoTitle, setMarcoTitle] = useState<string | null>(null);
  const [isSpotlightActive, setIsSpotlightActive] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);

  // Escala de tamanho de texto (15px, 17px, 20px)
  const [fontSizeLevel, setFontSizeLevel] = useState<15 | 17 | 20>(17);

  // Sheet de Novo Registro a partir do versículo
  const [registroSheetVisible, setRegistroSheetVisible] = useState(false);
  const [savingMarco, setSavingMarco] = useState(false);

  // Modal de Compartilhamento Visual Editorial
  const [visualShareVisible, setVisualShareVisible] = useState(false);
  const [visualShareData, setVisualShareData] = useState<VisualShareData | null>(null);

  // Modais Editoriais (Zero Alert.alert genérico)
  const [saveSuccessModal, setSaveSuccessModal] = useState<{
    visible: boolean;
    displayRef: string;
  }>({ visible: false, displayRef: '' });
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // Animação da barra flutuante de ação do versículo
  const barAnim = useRef(new Animated.Value(0)).current;
  const fontScaleAnim = useRef(new Animated.Value(1)).current;
  const passagePillScale = useRef(new Animated.Value(1)).current;

  // Escuta parâmetros de rota (quando o Leitor clica em "Ler passagem" no detalhe do marco)
  useEffect(() => {
    if (route?.params?.book_slug) {
      setCurrentBookSlug(route.params.book_slug);
    }
    if (route?.params?.chapter) {
      setCurrentChapter(route.params.chapter);
    }
    if (route?.params?.verse) {
      setSelectedVerseNum(route.params.verse);
      setHighlightSource(route.params.highlight_source || null);
      setConnectionExplanation(route.params.connection_explanation || null);
      setMarcoTitle(route.params.marco_title || null);
    }
  }, [route?.params]);

  // Carrega os dados do capítulo sempre que mudar o livro ou capítulo
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    loadBibleChapter(currentBookSlug, currentChapter).then((data) => {
      if (isMounted) {
        setChapterData(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentBookSlug, currentChapter]);

  // Anima barra flutuante quando um versículo é selecionado/desmarcado
  useEffect(() => {
    Animated.spring(barAnim, {
      toValue: selectedVerseNum !== null ? 1 : 0,
      tension: 100,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [selectedVerseNum]);

  // Scroll automático suave até o versículo quando recebido por parâmetro ou selecionado
  useEffect(() => {
    if (selectedVerseNum && !loading && chapterData) {
      const timer = setTimeout(() => {
        const y = versePositionsRef.current[selectedVerseNum];
        if (typeof y === 'number' && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [selectedVerseNum, loading, chapterData]);

  const handleSelectPassage = (book: BibleBookInfo, chapter: number) => {
    setCurrentBookSlug(book.slug);
    setCurrentChapter(chapter);
    setSelectedVerseNum(null);
    setIsSpotlightActive(false);
  };

  const handleToggleVerse = (num: number) => {
    setSelectedVerseNum((prev) => {
      if (prev === num) {
        setIsSpotlightActive(false);
        return null;
      }
      setIsSpotlightActive(false);
      return num;
    });
  };

  const handleToggleFontSize = () => {
    Animated.sequence([
      Animated.timing(fontScaleAnim, { toValue: 0.86, duration: 60, useNativeDriver: true }),
      Animated.spring(fontScaleAnim, { toValue: 1, tension: 350, friction: 8, useNativeDriver: true }),
    ]).start();

    if (fontSizeLevel === 15) setFontSizeLevel(17);
    else if (fontSizeLevel === 17) setFontSizeLevel(20);
    else setFontSizeLevel(15);
  };

  const currentBookInfo = findBook(currentBookSlug) || {
    name: chapterData?.bookName || 'Salmos',
    slug: currentBookSlug,
    testament: 'AT' as const,
    chapters: 150,
    abbrev: 'Sl',
  };

  // Navegação para capítulo anterior / próximo
  const canGoPrev = currentChapter > 1;
  const canGoNext = currentChapter < currentBookInfo.chapters;

  const handlePrevChapter = () => {
    if (canGoPrev) {
      setCurrentChapter((c) => c - 1);
      setSelectedVerseNum(null);
      setIsSpotlightActive(false);
    }
  };

  const handleNextChapter = () => {
    if (canGoNext) {
      setCurrentChapter((c) => c + 1);
      setSelectedVerseNum(null);
      setIsSpotlightActive(false);
    }
  };

  const selectedVerseObj = chapterData?.verses.find(
    (v) => v.number === selectedVerseNum,
  );

  const handleShareVerse = () => {
    if (!selectedVerseObj || !chapterData) return;
    setVisualShareData({
      title: `${chapterData.bookName} ${chapterData.chapter}:${selectedVerseObj.number}`,
      content: selectedVerseObj.text,
      bibleRefDisplay: `${chapterData.bookName} ${chapterData.chapter}:${selectedVerseObj.number}`,
      date: new Date().toISOString(),
      category: 'reflexao',
    });
    setVisualShareVisible(true);
  };

  const handleCreateMarcoFromVerse = () => {
    setRegistroSheetVisible(true);
  };

  const handleSaveNovoMarco = async (data: Omit<MemorialEntry, 'id' | 'created_at'>) => {
    try {
      setSavingMarco(true);
      const saved = await saveUserMemorial(data);

      // Dispara inteligência de conexões bíblicas em background
      attachAiConnectionsToMemorial(saved.id, saved).catch((err) => {
        console.log('[Memorial] Conexões em background com aviso:', err);
      });

      setRegistroSheetVisible(false);
      const displayRef = data.bible_ref?.display || 'esta passagem';
      setSaveSuccessModal({
        visible: true,
        displayRef,
      });
    } catch (err: any) {
      console.warn('Erro ao salvar marco da bíblia:', err);
      setErrorModal({
        visible: true,
        title: 'Erro ao Salvar Marco',
        message: err?.message || 'Não foi possível registrar o marco na Linha Sagrada.',
      });
    } finally {
      setSavingMarco(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.surface}
      />

      {/* ── Top Header ── */}
      <View style={s.header}>
        {/* Seletor de Livro / Capítulo */}
        <Animated.View style={{ transform: [{ scale: passagePillScale }] }}>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            onPressIn={() =>
              Animated.spring(passagePillScale, { toValue: 0.95, useNativeDriver: true, tension: 400, friction: 10 }).start()
            }
            onPressOut={() =>
              Animated.spring(passagePillScale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 10 }).start()
            }
            style={s.passagePill}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Escolher livro e capítulo"
          >
            <Text style={s.passageText}>
              {chapterData?.bookName || currentBookInfo.name} {currentChapter}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.amber.DEFAULT} />
          </TouchableOpacity>
        </Animated.View>

        {/* Ações à direita: Ajuste de fonte */}
        <View style={s.headerRight}>
          <Animated.View style={{ transform: [{ scale: fontScaleAnim }] }}>
            <TouchableOpacity
              onPress={handleToggleFontSize}
              style={s.iconButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Alternar tamanho da letra"
            >
              <Text style={s.fontSizeIconText}>AA</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* ── Área de Leitura Bíblica ── */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator color={colors.amber.DEFAULT} size="small" />
          <Text style={s.loadingText}>Carregando Escrituras…</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Título editorial do capítulo se disponível */}
          {chapterData?.title ? (
            <View style={s.chapterTitleWrap}>
              <Text style={s.chapterSuper}>
                {chapterData.bookName.toUpperCase()} {chapterData.chapter}
              </Text>
              <Text style={s.chapterTitle}>{chapterData.title}</Text>
            </View>
          ) : (
            <View style={s.chapterTitleWrap}>
              <Text style={s.chapterSuper}>
                {chapterData?.bookName.toUpperCase()}
              </Text>
              <Text style={s.chapterTitle}>Capítulo {chapterData?.chapter}</Text>
            </View>
          )}

          {/* Versículos */}
          <View style={s.versesContainer}>
            {chapterData?.verses.map((verse) => {
              const isSelected = selectedVerseNum === verse.number;
              const hasSelection = selectedVerseNum !== null;
              const lineHeight = fontSizeLevel === 15 ? 25 : fontSizeLevel === 17 ? 28 : 32;

              return (
                <TouchableOpacity
                  key={verse.number}
                  onLayout={(event) => {
                    versePositionsRef.current[verse.number] = event.nativeEvent.layout.y;
                  }}
                  onPress={() => handleToggleVerse(verse.number)}
                  activeOpacity={0.75}
                  style={[
                    s.verseRow,
                    isSelected && s.verseRowSelected,
                    hasSelection && !isSelected && s.verseRowDimmed,
                  ]}
                >
                  <View style={s.verseNumberWrap}>
                    {isSelected && <Text style={s.verseBullet}>◆</Text>}
                    <Text
                      style={[
                        s.verseNumber,
                        isSelected && s.verseNumberSelected,
                        hasSelection && !isSelected && s.verseDimmedText,
                      ]}
                    >
                      {verse.number}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.verseContent,
                      {
                        fontSize: fontSizeLevel,
                        lineHeight,
                      },
                      isSelected && s.verseContentSelected,
                      hasSelection && !isSelected && s.verseContentDimmed,
                    ]}
                  >
                    {verse.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Navegação de Capítulos no rodapé ── */}
          <View style={s.chapterNavRow}>
            <TouchableOpacity
              onPress={handlePrevChapter}
              disabled={!canGoPrev}
              style={[s.navBtn, !canGoPrev && s.navBtnDisabled]}
              activeOpacity={0.7}
            >
              <Feather
                name="chevron-left"
                size={18}
                color={canGoPrev ? colors.text.primary : colors.text.muted}
              />
              <Text style={[s.navBtnText, !canGoPrev && s.navBtnTextDisabled]}>
                Cap. {currentChapter - 1}
              </Text>
            </TouchableOpacity>

            <View style={s.navDivider} />

            <TouchableOpacity
              onPress={handleNextChapter}
              disabled={!canGoNext}
              style={[s.navBtn, !canGoNext && s.navBtnDisabled]}
              activeOpacity={0.7}
            >
              <Text style={[s.navBtnText, !canGoNext && s.navBtnTextDisabled]}>
                Cap. {currentChapter + 1}
              </Text>
              <Feather
                name="chevron-right"
                size={18}
                color={canGoNext ? colors.text.primary : colors.text.muted}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Barra de Ação Flutuante do Versículo Selecionado ── */}
      <Animated.View
        style={[
          s.floatingBar,
          {
            bottom: insets.bottom + 12,
            opacity: barAnim,
            transform: [
              {
                translateY: barAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={selectedVerseNum !== null ? 'auto' : 'none'}
      >
        <View style={s.floatingLeft}>
          <Text style={s.floatingRef} numberOfLines={1}>
            {chapterData?.bookName} {chapterData?.chapter}:{selectedVerseNum}
          </Text>
          <Text style={s.floatingSub} numberOfLines={1}>
            {highlightSource === 'conexao' ? 'Passagem conectada' : 'Versículo selecionado'}
          </Text>
        </View>

        <View style={s.floatingActions}>
          {highlightSource === 'conexao' && navigation?.canGoBack?.() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={s.returnMarcoBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Voltar ao marco"
            >
              <Feather name="arrow-left" size={13} color={colors.amber.DEFAULT} />
              <Text style={s.returnMarcoBtnText}>Voltar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleShareVerse}
            style={s.floatingIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar versículo"
          >
            <Feather name="share-2" size={15} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateMarcoFromVerse}
            style={s.createMarcoBtn}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Criar marco a partir do versículo"
          >
            <Feather name="bookmark" size={13} color={colors.text.onAmber} />
            <Text style={s.createMarcoBtnText}>Criar Marco</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedVerseNum(null)}
            style={s.dismissBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Desmarcar versículo"
          >
            <Feather name="x" size={15} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Modal seletor de livros e capítulos */}
      <BookPickerModal
        visible={pickerVisible}
        currentBookSlug={currentBookSlug}
        currentChapter={currentChapter}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectPassage}
      />

      {/* Sheet para Novo Registro pré-configurado com o versículo bíblico */}
      <NovoRegistroSheet
        visible={registroSheetVisible}
        onClose={() => setRegistroSheetVisible(false)}
        onSave={handleSaveNovoMarco}
        initialCategory="reflexao"
        initialBibleRef={
          selectedVerseNum && chapterData
            ? {
                book: chapterData.bookName,
                slug: currentBookSlug,
                chapter: currentChapter,
                verse: selectedVerseNum,
                display: `${chapterData.bookName} ${currentChapter}:${selectedVerseNum}`,
              }
            : null
        }
        initialVerseText={selectedVerseObj?.text}
        initialTitle={
          selectedVerseNum && chapterData
            ? `Reflexão em ${chapterData.bookName} ${currentChapter}:${selectedVerseNum}`
            : undefined
        }
      />

      {/* ── Modal de Compartilhamento Visual Editorial ── */}
      {visualShareData && (
        <VisualShareModal
          visible={visualShareVisible}
          onClose={() => setVisualShareVisible(false)}
          data={visualShareData}
        />
      )}

      {/* ── Modal de Sucesso Editorial ao Salvar Marco da Bíblia ── */}
      <ConfirmModal
        visible={saveSuccessModal.visible}
        onClose={() => {
          setSaveSuccessModal({ visible: false, displayRef: '' });
          setSelectedVerseNum(null);
        }}
        title="Marco de Fé Registrado"
        message={`Seu relato foi vinculado a ${saveSuccessModal.displayRef} e eternizado na Linha Sagrada.`}
        icon="bookmark"
        confirmLabel="Ver na Linha Sagrada"
        cancelLabel="Continuar Lendo"
        onConfirm={() => {
          setSaveSuccessModal({ visible: false, displayRef: '' });
          setSelectedVerseNum(null);
          navigation?.navigate?.('LinhaSagrada');
        }}
      />

      {/* ── Modal de Erro Editorial ── */}
      <ConfirmModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
        icon="alert-circle"
        confirmLabel="Entendido"
        cancelLabel=""
        destructive
        onConfirm={() => setErrorModal({ visible: false, title: '', message: '' })}
      />
    </View>
  );
}

function getBibliaStyles(colors: ColorTokens, isDark: boolean) {
  const themedShadows = getThemedShadows(isDark);
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['3'],
    backgroundColor: colors.bg.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },
  passagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg.raised,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  passageText: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeIconText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: typography.weight.bold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    fontStyle: 'italic',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing['6'],
    paddingTop: spacing['6'],
  },
  chapterTitleWrap: {
    gap: 4,
    marginBottom: spacing['6'],
    paddingBottom: spacing['4'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  chapterSuper: {
    color: colors.amber.DEFAULT,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
  },
  chapterTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: typography.weight.bold,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 30,
  },
  versesContainer: {
    gap: 12,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  verseRowSelected: {
    backgroundColor: colors.amber.muted,
  },
  verseRowDimmed: {
    opacity: 0.38,
  },
  verseNumberWrap: {
    minWidth: 24,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  verseBullet: {
    color: colors.amber.DEFAULT,
    fontSize: 7,
  },
  verseNumber: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    textAlign: 'right',
  },
  verseNumberSelected: {
    color: colors.amber.DEFAULT,
    fontWeight: typography.weight.bold,
  },
  verseDimmedText: {
    color: isDark ? '#656070' : colors.text.muted,
  },
  verseContent: {
    flex: 1,
    color: isDark ? '#D4CFDA' : colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.1,
  },
  verseContentSelected: {
    color: isDark ? '#FFFFFF' : colors.text.primary,
    fontWeight: Platform.OS === 'ios' ? '500' : '600',
  },
  verseContentDimmed: {
    color: isDark ? '#726D7C' : colors.text.muted,
  },
  chapterNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing['8'],
    paddingTop: spacing['4'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.DEFAULT,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  navBtnTextDisabled: {
    color: colors.text.muted,
  },
  navDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border.DEFAULT,
  },
  floatingBar: {
    position: 'absolute',
    left: spacing['3'],
    right: spacing['3'],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    ...themedShadows.sheet,
  },
  floatingLeft: {
    flexShrink: 1,
    gap: 1,
  },
  floatingRef: {
    color: colors.amber.DEFAULT,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  floatingSub: {
    color: colors.text.muted,
    fontSize: 11,
  },
  floatingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  returnMarcoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.active,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: radius.sm,
  },
  returnMarcoBtnText: {
    color: colors.amber.DEFAULT,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
  floatingIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createMarcoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.amber.DEFAULT,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.sm,
    ...themedShadows.amber,
  },
  createMarcoBtnText: {
    color: colors.text.onAmber,
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  dismissBtn: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
}

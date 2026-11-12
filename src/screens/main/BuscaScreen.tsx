import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';
import { MemorialCard } from '../../components/memorial/MemorialCard';
import { NovoRegistroSheet } from '../../components/memorial/NovoRegistroSheet';
import { MemorialEntry, BibleRef } from '../../lib/types';
import { fetchUserMemorials, saveUserMemorial } from '../../lib/memorialStore';
import {
  searchMemorialEntries,
  searchBibleVerses,
  BibleSearchResult,
} from '../../lib/searchService';
import { queryScriptureThread } from '../../lib/scriptureThreadService';
import { ScriptureResultCard, ScripturePassageData } from '../../components/bible/ScriptureResultCard';

type SearchTab = 'marcos' | 'escrituras';

const QUICK_TAGS = ['#providência', '#família', '#decisão', '#revelação', '#consagração'];
const QUICK_THEMES = ['paz', 'provisão', 'fidelidade', 'pastor', 'refúgio', 'cura'];

// Perguntas de exemplo que ativam a Consulta de Passagem Direta via JEV
const SCRIPTURE_QUERY_EXAMPLES = [
  'Onde Paulo fala da armadura de Deus?',
  'Qual passagem mostra a genealogia de Jesus?',
  'O Senhor é meu pastor',
  'Onde está o Pai Nosso na Bíblia?',
  'Mais que vencedores nada nos separará',
  'O Verbo se fez carne',
  'Bem-aventurados os humildes',
  'Esconderijo do Altíssimo',
  'Hino ao amor 1 Coríntios',
  'O servo sofredor em Isaías',
];

interface Props {
  navigation?: any;
  route?: {
    params?: {
      initialQuery?: string;
      tab?: SearchTab;
    };
  };
}

export function BuscaScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [query, setQuery] = useState(route?.params?.initialQuery || '');
  const [activeTab, setActiveTab] = useState<SearchTab>(
    route?.params?.tab || (route?.params?.initialQuery ? 'escrituras' : 'marcos')
  );
  const [onlyAnswered, setOnlyAnswered] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (route?.params?.initialQuery !== undefined) {
      setQuery(route.params.initialQuery);
    }
    if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    } else if (route?.params?.initialQuery) {
      setActiveTab('escrituras');
    }
  }, [route?.params?.initialQuery, route?.params?.tab]);

  const s = useMemo(() => getBuscaStyles(colors, isDark), [colors, isDark]);

  // Resultados
  const [allMemorials, setAllMemorials] = useState<MemorialEntry[]>([]);
  const [memorialResults, setMemorialResults] = useState<MemorialEntry[]>([]);
  const [bibleResults, setBibleResults] = useState<BibleSearchResult[]>([]);
  const [directPassage, setDirectPassage] = useState<ScripturePassageData | null>(null);
  const [bibleTotal, setBibleTotal] = useState(0);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sheet de novo registro a partir de versículo bíblico ou passagem direta
  const [sheetVisible, setSheetVisible] = useState(false);
  const [prefilledVerse, setPrefilledVerse] = useState<BibleSearchResult | null>(null);
  const [prefilledBibleRef, setPrefilledBibleRef] = useState<BibleRef | null>(null);
  const [prefilledVerseText, setPrefilledVerseText] = useState<string | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);

  const loadMemorials = async () => {
    const data = await fetchUserMemorials();
    setAllMemorials(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadMemorials();
    }, [])
  );

  // Busca em Marcos de Fé (local, rápida)
  useEffect(() => {
    let effectiveQuery = query;
    if (selectedTag) {
      effectiveQuery = selectedTag;
    }

    const filtered = searchMemorialEntries(
      allMemorials,
      effectiveQuery,
      undefined,
      onlyAnswered
    );
    setMemorialResults(filtered);
  }, [allMemorials, query, onlyAnswered, selectedTag]);

  // Busca em Escrituras (Consulta Direta via JEV com Fallback Silencioso FTS)
  useEffect(() => {
    if (activeTab !== 'escrituras' || !query.trim()) {
      if (!query.trim()) {
        setBibleResults([]);
        setBibleTotal(0);
        setDirectPassage(null);
      }
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setBibleLoading(true);
    const timer = setTimeout(() => {
      queryScriptureThread(query, { signal: controller.signal })
        .then((res) => {
          if (res.type === 'direct_passage') {
            setDirectPassage(res.passage);
            setBibleResults([]);
            setBibleTotal(1);
          } else {
            setDirectPassage(null);
            setBibleResults(res.results);
            setBibleTotal(res.total);
          }
          setBibleLoading(false);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            setBibleLoading(false);
          }
        });
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, activeTab]);

  const handleLoadMoreBible = () => {
    if (loadingMore || bibleResults.length >= bibleTotal || !query.trim() || directPassage) return;
    setLoadingMore(true);

    searchBibleVerses(query, bibleResults.length, 30)
      .then((res) => {
        setBibleResults((prev) => [...prev, ...res.results]);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  };

  const handleSelectTagChip = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
      setQuery('');
      setActiveTab('marcos');
    }
  };

  const handleSelectThemeChip = (theme: string) => {
    setQuery(theme);
    setSelectedTag(null);
  };

  const handleSelectScriptureExample = (example: string) => {
    setQuery(example);
    setActiveTab('escrituras');
    setSelectedTag(null);
  };

  const handleCardPress = (entry: MemorialEntry) => {
    navigation?.navigate?.('MarcoDetalhe', { entry });
  };

  const handleReadDirectPassage = (bookSlug: string, chapter: number, verse: number) => {
    navigation?.navigate?.('Main', {
      screen: 'Biblia',
      params: {
        book_slug: bookSlug,
        chapter,
        verse,
      },
    });
  };

  const handleReadBiblePassage = (verse: BibleSearchResult) => {
    navigation?.navigate?.('Main', {
      screen: 'Biblia',
      params: {
        book_slug: verse.bookSlug,
        chapter: verse.chapter,
        verse: verse.verse,
      },
    });
  };

  const handleCreateMarcoFromVerse = (verse: BibleSearchResult) => {
    setPrefilledVerse(verse);
    setPrefilledBibleRef({
      book: verse.bookName,
      slug: verse.bookSlug,
      chapter: verse.chapter,
      verse: verse.verse,
      display: verse.reference,
      version: 'ACF',
    });
    setPrefilledVerseText(verse.text);
    setSheetVisible(true);
  };

  const handleCreateMarcoFromPassage = (passage: ScripturePassageData) => {
    setPrefilledBibleRef({
      book: passage.book_name,
      slug: passage.book_slug,
      chapter: passage.chapter,
      verse: passage.start_verse,
      display: passage.reference,
      version: 'ACF',
    });
    const combinedVerseText = passage.verses.map((v) => `${v.verse}. ${v.text}`).join('\n');
    setPrefilledVerseText(combinedVerseText);
    setSheetVisible(true);
  };

  const renderBibleResultItem = ({ item }: { item: BibleSearchResult }) => (
    <View style={s.bibleCard}>
      <View style={s.bibleHeader}>
        <Text style={s.bibleRefText}>{item.reference}</Text>
        <TouchableOpacity
          onPress={() => handleReadBiblePassage(item)}
          style={s.readChapterLink}
          activeOpacity={0.7}
        >
          <Text style={s.readChapterLinkText}>Ler capítulo</Text>
          <Feather name="arrow-right" size={12} color={colors.amber.DEFAULT} />
        </TouchableOpacity>
      </View>

      <Text style={s.bibleVerseText}>"{item.text}"</Text>

      <View style={s.bibleCardFooter}>
        <TouchableOpacity
          onPress={() => handleCreateMarcoFromVerse(item)}
          style={s.connectToMemorialBtn}
          activeOpacity={0.75}
        >
          <Feather name="bookmark" size={13} color={colors.amber.DEFAULT} />
          <Text style={s.connectToMemorialBtnText}>Criar marco com esta passagem</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar hidden={true} />

      {/* ── Top Header ── */}
      <View style={s.topHeader}>
        <Text style={s.wordmark}>BUSCA ESPIRITUAL</Text>
      </View>

      {/* ── Barra de Input de Busca ── */}
      <View style={s.searchBarContainer}>
        <View style={s.searchBox}>
          <Feather name="search" size={18} color={colors.text.muted} />
          <TextInput
            style={s.searchInput}
            placeholder={
              activeTab === 'marcos'
                ? 'Buscar por tema, tag, palavra ou data…'
                : 'Faça uma pergunta ou busque um tema bíblico…'
            }
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              if (selectedTag) setSelectedTag(null);
            }}
            selectionColor={colors.amber.DEFAULT}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setSelectedTag(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Segmented Control (Abas) ── */}
      <View style={s.tabRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('marcos')}
          style={[s.tabPill, activeTab === 'marcos' && s.tabPillActive]}
          activeOpacity={0.8}
        >
          <Text style={[s.tabPillText, activeTab === 'marcos' && s.tabPillTextActive]}>
            Marcos de Fé ({memorialResults.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('escrituras')}
          style={[s.tabPill, activeTab === 'escrituras' && s.tabPillActive]}
          activeOpacity={0.8}
        >
          <View style={s.tabPillContent}>
            <Text style={[s.tabPillText, activeTab === 'escrituras' && s.tabPillTextActive]}>
              Escrituras {bibleTotal > 0 ? `(${bibleTotal.toLocaleString('pt-BR')})` : ''}
            </Text>
            {activeTab !== 'escrituras' && (
              <View style={s.tabPillBadge}>
                <Text style={s.tabPillBadgeText}>IA</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Filtros rápidos (Quando na aba Marcos) ── */}
      {activeTab === 'marcos' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsScrollView}
          contentContainerStyle={s.chipsRow}
        >
          <TouchableOpacity
            onPress={() => {
              setOnlyAnswered(false);
              setSelectedTag(null);
            }}
            style={[
              s.filterChip,
              !onlyAnswered && !selectedTag && s.filterChipActive,
            ]}
          >
            <Text
              style={[
                s.filterChipText,
                !onlyAnswered && !selectedTag && s.filterChipTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOnlyAnswered((v) => !v)}
            style={[s.filterChip, onlyAnswered && s.filterChipActive]}
          >
            <Feather
              name="check"
              size={12}
              color={onlyAnswered ? colors.amber.DEFAULT : colors.text.muted}
            />
            <Text
              style={[
                s.filterChipText,
                onlyAnswered && s.filterChipTextActive,
              ]}
            >
              Respondidas
            </Text>
          </TouchableOpacity>

          {QUICK_TAGS.map((tag) => {
            const isTagActive = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => handleSelectTagChip(tag)}
                style={[s.filterChip, isTagActive && s.filterChipActive]}
              >
                <Text
                  style={[
                    s.filterChipText,
                    isTagActive && s.filterChipTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Conteúdo dos Resultados ── */}
      {activeTab === 'marcos' ? (
        // ── Resultados em Marcos de Fé ──
        memorialResults.length === 0 ? (
          <View style={s.emptyContainer}>
            <View style={s.emptyIconWrap}>
              <Feather name="search" size={26} color={colors.text.muted} />
            </View>
            <Text style={s.emptyTitle}>Nenhum marco encontrado</Text>
            <Text style={s.emptySubtitle}>
              Tente buscar por outras palavras, tags ou filtre por orações respondidas.
            </Text>

            {/* Sugestões de temas */}
            <View style={s.suggestionsBox}>
              <Text style={s.suggestionsLabel}>SUGESTÕES DE BUSCA</Text>
              <View style={s.suggestionChipsWrap}>
                {QUICK_THEMES.map((theme) => (
                  <TouchableOpacity
                    key={theme}
                    onPress={() => handleSelectThemeChip(theme)}
                    style={s.suggestionChip}
                  >
                    <Text style={s.suggestionChipText}>{theme}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            data={memorialResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              s.listContent,
              { paddingBottom: insets.bottom + 90 },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={s.cardWrapper}>
                <MemorialCard
                  entry={item}
                  onPress={() => handleCardPress(item)}
                />
              </View>
            )}
          />
        )
      ) : (
        // ── Resultados em Escrituras (Bíblia) ──
        bibleLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator color={colors.amber.DEFAULT} size="small" />
            <Text style={s.loadingText}>Pesquisando nas Escrituras…</Text>
          </View>
        ) : directPassage ? (
          <ScrollView
            contentContainerStyle={[
              s.listContent,
              { paddingBottom: insets.bottom + 90 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <ScriptureResultCard
              passage={directPassage}
              onNavigateToPassage={handleReadDirectPassage}
              onCreateMarco={handleCreateMarcoFromPassage}
            />
          </ScrollView>
        ) : bibleResults.length === 0 ? (
          <View style={s.emptyContainer}>
            <View style={s.emptyIconWrap}>
              <Feather name="book-open" size={26} color={colors.text.muted} />
            </View>
            <Text style={s.emptyTitle}>
              {query.trim()
                ? 'Nenhum versículo encontrado'
                : 'Consulta Bíblica por Intenção'}
            </Text>
            <Text style={s.emptySubtitle}>
              {query.trim()
                ? `Nenhuma passagem encontrada para "${query}". Tente reformular a pergunta.`
                : 'Digite uma pergunta em linguagem natural ou uma palavra-chave. O Memorial encontra a passagem exata nas Escrituras.'}
            </Text>

            {/* Exemplos de consulta por linguagem natural */}
            {!query.trim() && (
              <View style={s.suggestionsBox}>
                <View style={s.suggestionsLabelRow}>
                  <Feather name="zap" size={10} color={colors.amber.DEFAULT} />
                  <Text style={s.suggestionsLabel}>EXEMPLOS DE CONSULTA</Text>
                </View>
                <View style={s.suggestionChipsWrap}>
                  {SCRIPTURE_QUERY_EXAMPLES.map((example) => (
                    <TouchableOpacity
                      key={example}
                      onPress={() => handleSelectScriptureExample(example)}
                      style={s.suggestionChip}
                    >
                      <Text style={s.suggestionChipText}>{example}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={bibleResults}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={[
              s.listContent,
              { paddingBottom: insets.bottom + 90 },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={renderBibleResultItem}
            ListHeaderComponent={
              bibleTotal > 0 ? (
                <View style={s.resultsMetaRow}>
                  <Text style={s.resultsMetaText}>
                    {bibleTotal.toLocaleString('pt-BR')} passagens encontradas · Almeida Corrigida Fiel (ACF)
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              bibleResults.length < bibleTotal ? (
                <TouchableOpacity
                  onPress={handleLoadMoreBible}
                  disabled={loadingMore}
                  style={s.loadMoreBtn}
                  activeOpacity={0.8}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
                  ) : (
                    <>
                      <Text style={s.loadMoreBtnText}>Carregar mais passagens</Text>
                      <Feather name="chevron-down" size={16} color={colors.amber.DEFAULT} />
                    </>
                  )}
                </TouchableOpacity>
              ) : null
            }
            onEndReached={handleLoadMoreBible}
            onEndReachedThreshold={0.4}
          />
        )
      )}

      {/* Sheet para criar novo registro se disparado a partir de um versículo encontrado ou passagem direta */}
      <NovoRegistroSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setPrefilledBibleRef(null);
          setPrefilledVerseText(undefined);
          setPrefilledVerse(null);
        }}
        initialBibleRef={prefilledBibleRef}
        initialVerseText={prefilledVerseText}
        onSave={async (entry) => {
          try {
            await saveUserMemorial(entry);
            await loadMemorials();
          } catch (e) {
            console.warn('Erro ao salvar novo registro a partir da busca:', e);
          }
          setSheetVisible(false);
          setPrefilledBibleRef(null);
          setPrefilledVerseText(undefined);
          setPrefilledVerse(null);
          navigation?.navigate?.('LinhaSagrada');
        }}
      />
    </View>
  );
}

function getBuscaStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  topHeader: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['4'],
    paddingBottom: spacing['2'],
  },
  wordmark: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 2.2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  searchBarContainer: {
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['2'],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacing['4'],
    height: 48,
    gap: spacing['3'],
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size.sm,
    paddingVertical: 0,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    marginHorizontal: spacing['5'],
    marginTop: spacing['2'],
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  tabPillActive: {
    backgroundColor: colors.bg.raised,
  },
  tabPillText: {
    color: colors.text.muted,
    fontSize: 12,
  },
  tabPillTextActive: {
    color: colors.amber.DEFAULT,
    fontWeight: typography.weight.bold,
  },
  chipsScrollView: {
    flexGrow: 0,
    flexShrink: 0,
    height: 50,
  },
  chipsRow: {
    paddingHorizontal: spacing['5'],
    alignItems: 'center',
    gap: spacing['2'],
    height: 50,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterChipActive: {
    backgroundColor: colors.bg.raised,
    borderColor: colors.amber.DEFAULT,
  },
  filterChipText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: typography.weight.medium,
  },
  filterChipTextActive: {
    color: colors.amber.DEFAULT,
    fontWeight: typography.weight.semibold,
  },
  listContent: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['3'],
    gap: spacing['3'],
  },
  cardWrapper: {
    marginBottom: spacing['2'],
  },
  bibleCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing['4'],
    gap: spacing['3'],
  },
  bibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bibleRefText: {
    color: colors.amber.DEFAULT,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.2,
  },
  readChapterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readChapterLinkText: {
    color: colors.amber.DEFAULT,
    fontSize: 11,
    fontWeight: typography.weight.medium,
  },
  bibleVerseText: {
    color: isDark ? '#D4CFDA' : colors.text.primary,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  bibleCardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing['2'],
  },
  connectToMemorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  connectToMemorialBtnText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: spacing['12'],
  },
  loadingText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['8'],
    paddingTop: spacing['10'],
    gap: spacing['3'],
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2'],
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  suggestionsBox: {
    marginTop: spacing['6'],
    width: '100%',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing['4'],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing['3'],
  },
  suggestionsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  suggestionsLabel: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  suggestionChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  suggestionChip: {
    backgroundColor: colors.bg.raised,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  suggestionChipText: {
    color: colors.amber.DEFAULT,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
  tabPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabPillBadge: {
    backgroundColor: colors.amber.DEFAULT,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tabPillBadgeText: {
    color: isDark ? '#1A140E' : '#1A140E',
    fontSize: 8,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  scriptureHintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: spacing['5'],
    marginTop: spacing['2'],
    backgroundColor: isDark ? 'rgba(231, 176, 117, 0.08)' : 'rgba(184, 126, 40, 0.07)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(231, 176, 117, 0.18)' : 'rgba(184, 126, 40, 0.20)',
    padding: spacing['3'],
  },
  scriptureHintText: {
    flex: 1,
    color: isDark ? 'rgba(231, 176, 117, 0.75)' : 'rgba(140, 95, 30, 0.85)',
    fontSize: 11.5,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  resultsMetaRow: {
    paddingVertical: spacing['2'],
    paddingBottom: spacing['3'],
  },
  resultsMetaText: {
    color: colors.text.muted,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingVertical: 14,
    marginTop: spacing['2'],
    marginBottom: spacing['6'],
  },
  loadMoreBtnText: {
    color: colors.amber.DEFAULT,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});
}


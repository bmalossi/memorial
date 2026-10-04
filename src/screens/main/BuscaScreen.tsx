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
import { MemorialEntry } from '../../lib/types';
import { fetchUserMemorials, saveUserMemorial } from '../../lib/memorialStore';
import {
  searchMemorialEntries,
  searchBibleVerses,
  BibleSearchResult,
} from '../../lib/searchService';

type SearchTab = 'marcos' | 'escrituras';

const QUICK_TAGS = ['#providência', '#família', '#decisão', '#revelação', '#consagração'];
const QUICK_THEMES = ['paz', 'provisão', 'fidelidade', 'pastor', 'refúgio', 'cura'];

interface Props {
  navigation?: any;
}

export function BuscaScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('marcos');
  const [onlyAnswered, setOnlyAnswered] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const s = useMemo(() => getBuscaStyles(colors, isDark), [colors, isDark]);

  // Resultados
  const [allMemorials, setAllMemorials] = useState<MemorialEntry[]>([]);
  const [memorialResults, setMemorialResults] = useState<MemorialEntry[]>([]);
  const [bibleResults, setBibleResults] = useState<BibleSearchResult[]>([]);
  const [bibleTotal, setBibleTotal] = useState(0);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sheet de novo registro a partir de versículo bíblico
  const [sheetVisible, setSheetVisible] = useState(false);
  const [prefilledVerse, setPrefilledVerse] = useState<BibleSearchResult | null>(null);

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

  // Busca em Escrituras da Bíblia (Worker / FTS com version=acf) com debounce
  useEffect(() => {
    if (activeTab !== 'escrituras' || !query.trim()) {
      if (!query.trim()) {
        setBibleResults([]);
        setBibleTotal(0);
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
      searchBibleVerses(query, 0, 50, controller.signal)
        .then((res) => {
          setBibleResults(res.results);
          setBibleTotal(res.total);
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
    if (loadingMore || bibleResults.length >= bibleTotal || !query.trim()) return;
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

  const handleCardPress = (entry: MemorialEntry) => {
    navigation?.navigate?.('MarcoDetalhe', { entry });
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
                : 'Buscar nas Escrituras (ex: pastor, paz, fé)…'
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
          <Text style={[s.tabPillText, activeTab === 'escrituras' && s.tabPillTextActive]}>
            Escrituras (Bíblia) {bibleTotal > 0 ? `(${bibleTotal.toLocaleString('pt-BR')})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Filtros rápidos (Quando na aba Marcos) ── */}
      {activeTab === 'marcos' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
        ) : bibleResults.length === 0 ? (
          <View style={s.emptyContainer}>
            <View style={s.emptyIconWrap}>
              <Feather name="book-open" size={26} color={colors.text.muted} />
            </View>
            <Text style={s.emptyTitle}>
              {query.trim()
                ? 'Nenhum versículo encontrado'
                : 'Pesquise nas Escrituras'}
            </Text>
            <Text style={s.emptySubtitle}>
              {query.trim()
                ? `Nenhuma passagem bíblica encontrada com o termo "${query}".`
                : 'Digite uma palavra para localizar passagens por relevância em toda a Bíblia.'}
            </Text>

            {/* Temas bíblicos rápidos */}
            <View style={s.suggestionsBox}>
              <Text style={s.suggestionsLabel}>PALAVRAS-CHAVE DAS ESCRITURAS</Text>
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

      {/* Sheet para criar novo registro se disparado a partir de um versículo encontrado */}
      <NovoRegistroSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={async (entry) => {
          try {
            await saveUserMemorial(entry);
            await loadMemorials();
          } catch (e) {
            console.warn('Erro ao salvar novo registro a partir da busca:', e);
          }
          setSheetVisible(false);
          navigation?.navigate?.('LinhasaGrada');
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
  chipsRow: {
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['3'],
    gap: spacing['2'],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 12,
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

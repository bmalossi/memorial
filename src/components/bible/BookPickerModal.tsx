import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';
import { BIBLE_BOOKS, BibleBookInfo } from '../../lib/bibleData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  currentBookSlug: string;
  currentChapter: number;
  onClose: () => void;
  onSelect: (book: BibleBookInfo, chapter: number) => void;
}

export function BookPickerModal({
  visible,
  currentBookSlug,
  currentChapter,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [testament, setTestament] = useState<'AT' | 'NT'>('AT');
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<BibleBookInfo | null>(null);

  const s = useMemo(() => getPickerStyles(colors, isDark), [colors, isDark]);

  const filteredBooks = BIBLE_BOOKS.filter((b) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.abbrev.toLowerCase().includes(q);
    }
    return b.testament === testament;
  });

  const handleSelectBook = (book: BibleBookInfo) => {
    setSelectedBook(book);
  };

  const handleSelectChapter = (ch: number) => {
    if (selectedBook) {
      onSelect(selectedBook, ch);
      setSelectedBook(null);
      setSearch('');
      onClose();
    }
  };

  const handleBackToBooks = () => {
    setSelectedBook(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View
          style={[
            s.sheet,
            {
              paddingTop: spacing['4'],
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              {selectedBook ? (
                <TouchableOpacity
                  onPress={handleBackToBooks}
                  style={s.backBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar aos livros"
                >
                  <Feather name="chevron-left" size={20} color={colors.text.primary} />
                  <Text style={s.backBtnText}>Livros</Text>
                </TouchableOpacity>
              ) : (
                <Text style={s.title}>SELECIONAR PASSAGEM</Text>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={s.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <Feather name="x" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Se estiver escolhendo os capítulos de um livro selecionado */}
          {selectedBook ? (
            <View style={s.chapterContainer}>
              <View style={s.chapterHeader}>
                <Text style={s.bookSelectedTitle}>{selectedBook.name}</Text>
                <Text style={s.chapterSubtitle}>Escolha o capítulo</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.chapterGrid}
              >
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                  const isCurrent =
                    selectedBook.slug === currentBookSlug && ch === currentChapter;
                  return (
                    <TouchableOpacity
                      key={ch}
                      onPress={() => handleSelectChapter(ch)}
                      style={[s.chapterChip, isCurrent && s.chapterChipCurrent]}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Capítulo ${ch}`}
                    >
                      <Text
                        style={[
                          s.chapterChipText,
                          isCurrent && s.chapterChipTextCurrent,
                        ]}
                      >
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            // Lista de Livros (com abas AT / NT e busca)
            <View style={s.booksContainer}>
              {/* Barra de busca */}
              <View style={s.searchBar}>
                <Feather name="search" size={16} color={colors.text.muted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Buscar livro bíblico..."
                  placeholderTextColor={colors.text.muted}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  selectionColor={colors.amber.DEFAULT}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Feather name="x" size={14} color={colors.text.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Seletor AT / NT (visível se não houver busca ativa) */}
              {!search.trim() && (
                <View style={s.tabRow}>
                  <TouchableOpacity
                    onPress={() => setTestament('AT')}
                    style={[s.tab, testament === 'AT' && s.tabActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.tabText, testament === 'AT' && s.tabTextActive]}>
                      Antigo Testamento (39)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTestament('NT')}
                    style={[s.tab, testament === 'NT' && s.tabActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.tabText, testament === 'NT' && s.tabTextActive]}>
                      Novo Testamento (27)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Grade de Livros */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.bookList}
              >
                {filteredBooks.map((book) => {
                  const isCurrent = book.slug === currentBookSlug;
                  return (
                    <TouchableOpacity
                      key={book.slug}
                      onPress={() => handleSelectBook(book)}
                      style={[s.bookCard, isCurrent && s.bookCardCurrent]}
                      activeOpacity={0.7}
                    >
                      <View style={s.bookMeta}>
                        <Text style={[s.bookName, isCurrent && s.bookNameCurrent]}>
                          {book.name}
                        </Text>
                        <Text style={s.bookChaptersCount}>
                          {book.chapters} cap.
                        </Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={isCurrent ? colors.amber.DEFAULT : colors.text.muted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getPickerStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border.DEFAULT,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.DEFAULT,
    alignSelf: 'center',
    marginBottom: spacing['3'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  title: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  booksContainer: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['4'],
    gap: spacing['3'],
    maxHeight: SCREEN_HEIGHT * 0.72,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.raised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacing['3'],
    height: 42,
    gap: spacing['2'],
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size.sm,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.raised,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  tabActive: {
    backgroundColor: colors.bg.surface,
  },
  tabText: {
    color: colors.text.muted,
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.amber.DEFAULT,
    fontWeight: typography.weight.semibold,
  },
  bookList: {
    paddingBottom: spacing['6'],
    gap: 6,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.raised,
    borderRadius: radius.md,
    paddingHorizontal: spacing['4'],
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  bookCardCurrent: {
    borderColor: colors.amber.DEFAULT,
  },
  bookMeta: {
    gap: 2,
  },
  bookName: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  bookNameCurrent: {
    color: colors.amber.DEFAULT,
    fontWeight: typography.weight.bold,
  },
  bookChaptersCount: {
    color: colors.text.muted,
    fontSize: 11,
  },
  chapterContainer: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['4'],
    gap: spacing['4'],
    maxHeight: SCREEN_HEIGHT * 0.72,
  },
  chapterHeader: {
    gap: 2,
  },
  bookSelectedTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: typography.weight.bold,
  },
  chapterSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: spacing['6'],
  },
  chapterChip: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterChipCurrent: {
    borderColor: colors.amber.DEFAULT,
    backgroundColor: colors.amber.muted,
  },
  chapterChipText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: typography.weight.medium,
  },
  chapterChipTextCurrent: {
    color: colors.amber.DEFAULT,
    fontWeight: typography.weight.bold,
  },
});
}

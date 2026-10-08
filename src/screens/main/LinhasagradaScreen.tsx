import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme, colors, ColorTokens, typography, spacing, radius } from '../../theme';
import { MemorialCard } from '../../components/memorial/MemorialCard';
import { NovoRegistroSheet } from '../../components/memorial/NovoRegistroSheet';
import { BottomQuickCaptureBar } from '../../components/memorial/BottomQuickCaptureBar';
import { MemorialEntry } from '../../lib/types';
import { generateAutoTitle } from '../../lib/utils';
import { MemorialCategory, supabase } from '../../lib/supabase';
import { PastoralCareBanner } from '../../components/memorial/PastoralCareBanner';
import { PastoralCareActionBanner } from '../../components/memorial/PastoralCareActionBanner';
import { PastoralOnboardingBanner } from '../../components/memorial/PastoralOnboardingBanner';
import { AtalaiaContactModal } from '../../components/memorial/AtalaiaContactModal';
import { triggerGlobalAtalaiaCrisis } from '../../lib/atalaiaCrisisManager';
import { PastoralContact } from '../../lib/atalaiaTypes';
import { PastoralIntent } from '../../lib/types';
import {
  classifyPastoralIntent,
  shouldShowPastoralActionBanner,
} from '../../lib/classifierJEV';
import {
  fetchUserMemorials,
  syncMemorialsWithSupabase,
  saveUserMemorial,
  markPrayerAnsweredInSupabase,
  updateMemorialPastoralIntent,
  subscribeToSyncState,
  SyncStateInfo,
} from '../../lib/memorialStore';
import { attachAiConnectionsToMemorial } from '../../lib/aiConnectionService';
import { searchMemorialEntries, SUGGESTED_THEMES } from '../../lib/searchService';
import {
  fetchCurrentPastoralContact,
  evaluateCareTriage,
  canShowCareBanner,
  dismissCareBanner,
  clearCareBannerDismissal,
  sendPastoralCareSignal,
  sendExplicitHelpRequest,
  sendPastoralEcosystemEmail,
} from '../../lib/atalaiaStore';

type Filter = 'todos' | MemorialCategory | 'respondidas';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'reflexao',   label: 'Reflexão' },
  { key: 'oracao',     label: 'Oração' },
  { key: 'respondidas', label: 'Respondidas' },
  { key: 'testemunho', label: 'Testemunho' },
  { key: 'jejum',      label: 'Jejum' },
];

function TimelineNode() {
  const { colors } = useTheme();
  return (
    <View style={node.wrapper}>
      <View style={[node.connector, { backgroundColor: colors.border.DEFAULT }]} />
      <View style={[node.dot, { borderColor: colors.border.DEFAULT, backgroundColor: colors.bg.surface }]}>
        <View style={[node.dotInner, { backgroundColor: colors.amber.DEFAULT }]} />
      </View>
    </View>
  );
}

const node = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems:    'center',
    width:         36,
    flexShrink:    0,
    marginTop:     spacing['5'],
  },
  connector: {
    flex:            1,
    height:          1,
    backgroundColor: colors.border.DEFAULT,
  },
  dot: {
    width:           14,
    height:          14,
    borderRadius:    7,
    borderWidth:     1,
    borderColor:     colors.border.DEFAULT,
    backgroundColor: colors.bg.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  dotInner: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.amber.DEFAULT,
  },
});

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={empty.container}>
      <View style={[empty.iconWrap, { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT }]}>
        <Feather name="book-open" size={26} color={colors.text.muted} />
      </View>
      <Text style={[empty.title, { color: colors.text.primary }]}>Nenhum marco registrado</Text>
      <Text style={[empty.subtitle, { color: colors.text.secondary }]}>
        Registre suas experiências com Deus para acompanhar a linha da sua jornada de fé.
      </Text>
      <TouchableOpacity
        style={[empty.btn, { backgroundColor: colors.amber.DEFAULT }]}
        onPress={onAdd}
        activeOpacity={0.82}
        accessibilityRole="button"
      >
        <Text style={[empty.btnText, { color: colors.text.onAmber }]}>Criar primeiro marco</Text>
      </TouchableOpacity>
    </View>
  );
}

function SearchEmptyState({
  query,
  activeFilter,
  onClear,
  onOpenBibleSearch,
}: {
  query: string;
  activeFilter: Filter;
  onClear: () => void;
  onOpenBibleSearch: () => void;
}) {
  const { colors } = useTheme();
  const hasQuery = query.trim().length > 0;
  return (
    <View style={empty.container}>
      <View style={[empty.iconWrap, { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT }]}>
        <Feather name="search" size={24} color={colors.text.muted} />
      </View>
      <Text style={[empty.title, { color: colors.text.primary }]}>Nenhum marco encontrado</Text>
      <Text style={[empty.subtitle, { color: colors.text.secondary }]}>
        {hasQuery
          ? `Nenhum marco espiritual corresponde ao termo "${query.trim()}". Tente buscar por temas bíblicos (ex: provisão, paz, cura) ou passagens das Escrituras.`
          : activeFilter === 'respondidas'
          ? 'Você ainda não possui orações marcadas como respondidas. Ao receber a vitória ou direcionamento do Senhor, registre sua resposta para celebrar!'
          : 'Nenhum marco registrado nesta categoria selecionada.'}
      </Text>

      <View style={empty.actionsRow}>
        <TouchableOpacity
          style={[empty.btnSecondary, { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT }]}
          onPress={onClear}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          <Text style={[empty.btnSecondaryText, { color: colors.text.secondary }]}>
            {hasQuery ? 'Limpar busca' : 'Ver todos os marcos'}
          </Text>
        </TouchableOpacity>

        {hasQuery && (
          <TouchableOpacity
            style={[empty.bibleLinkBtn, { borderColor: colors.border.subtle }]}
            onPress={onOpenBibleSearch}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Feather name="book-open" size={13} color={colors.amber.DEFAULT} style={{ marginRight: 6 }} />
            <Text style={[empty.bibleLinkText, { color: colors.amber.DEFAULT }]}>Pesquisar "{query.trim()}" no texto bíblico completo →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function ThemeChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, tension: 400, friction: 10 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 10 }).start()
        }
        style={[
          themesBar.chip,
          { backgroundColor: colors.bg.raised, borderColor: colors.border.subtle },
          isSelected && { borderColor: colors.amber.DEFAULT, backgroundColor: colors.bg.surface },
        ]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar por tema ${label}`}
        accessibilityState={{ selected: isSelected }}
      >
        <Text
          style={[
            themesBar.chipText,
            { color: colors.text.muted },
            isSelected && { color: colors.amber.DEFAULT, fontWeight: typography.weight.semibold },
          ]}
        >
          #{label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SuggestedThemesBar({
  activeQuery,
  onSelectTheme,
}: {
  activeQuery: string;
  onSelectTheme: (theme: string) => void;
}) {
  const { colors } = useTheme();
  const normQuery = activeQuery.trim().toLowerCase();
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        themesBar.container,
        {
          backgroundColor: colors.bg.surface,
          borderBottomColor: colors.border.DEFAULT,
          opacity: enterAnim,
          transform: [
            {
              translateY: enterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[themesBar.label, { color: colors.text.muted }]}>TEMAS:</Text>
      <FlatList
        horizontal
        data={SUGGESTED_THEMES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themesBar.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelected = normQuery === item.label.toLowerCase() || normQuery === item.id;
          return (
            <ThemeChip
              label={item.label}
              isSelected={isSelected}
              onPress={() => onSelectTheme(isSelected ? '' : item.label)}
            />
          );
        }}
      />
    </Animated.View>
  );
}

const empty = StyleSheet.create({
  container: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing['8'],
    paddingTop:        spacing['12'],
    gap:               spacing['3'],
  },
  iconWrap: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: colors.bg.surface,
    borderWidth:     1,
    borderColor:     colors.border.DEFAULT,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing['2'],
  },
  title: {
    color:      colors.text.primary,
    fontSize:   typography.size.lg,
    fontWeight: typography.weight.semibold,
    textAlign:  'center',
  },
  subtitle: {
    color:      colors.text.secondary,
    fontSize:   typography.size.sm,
    lineHeight: typography.size.sm * 1.5,
    textAlign:  'center',
  },
  btn: {
    marginTop:         spacing['3'],
    backgroundColor:   colors.amber.DEFAULT,
    paddingHorizontal: spacing['6'],
    height:            46,
    borderRadius:      radius.md,
    alignItems:        'center',
    justifyContent:    'center',
  },
  btnText: {
    color:      colors.text.onAmber,
    fontSize:   typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  actionsRow: {
    flexDirection:  'column',
    alignItems:     'center',
    gap:            spacing['3'],
    marginTop:      spacing['3'],
  },
  btnSecondary: {
    backgroundColor:   colors.bg.surface,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    paddingHorizontal: spacing['5'],
    height:            42,
    borderRadius:      radius.md,
    alignItems:        'center',
    justifyContent:    'center',
  },
  btnSecondaryText: {
    color:      colors.text.primary,
    fontSize:   typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  bibleLinkBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   spacing['2'],
    paddingHorizontal: spacing['3'],
  },
  bibleLinkText: {
    color:      colors.amber.DEFAULT,
    fontSize:   typography.size.xs,
    fontWeight: typography.weight.medium,
  },
});

const themesBar = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing['5'],
    paddingVertical:   spacing['2'],
    backgroundColor:   colors.bg.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
    gap:               spacing['2'],
  },
  label: {
    color:         colors.text.muted,
    fontSize:      10,
    fontWeight:    typography.weight.bold,
    letterSpacing: 1.2,
  },
  list: {
    gap:          spacing['2'],
    paddingRight: spacing['4'],
  },
  chip: {
    paddingHorizontal: spacing['3'],
    paddingVertical:   5,
    borderRadius:      radius.full,
    backgroundColor:   colors.bg.raised,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
  },
  chipActive: {
    borderColor:     colors.amber.DEFAULT,
    backgroundColor: 'rgba(217, 180, 99, 0.14)',
  },
  chipText: {
    color:    colors.text.secondary,
    fontSize: 12,
  },
  chipTextActive: {
    color:      colors.amber.DEFAULT,
    fontWeight: typography.weight.semibold,
  },
});

function ScreenHeader({
  onAvatarPress,
  onToggleSearch,
  isSearchOpen,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onSyncPress,
  syncInfo,
  initial = 'L',
}: {
  onAvatarPress: () => void;
  onToggleSearch: () => void;
  isSearchOpen: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearSearch: () => void;
  onSyncPress?: () => void;
  syncInfo?: SyncStateInfo;
  initial?: string;
}) {
  const { colors } = useTheme();

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isSearchOpen]);

  if (isSearchOpen) {
    return (
      <Animated.View
        style={[
          header.searchRow,
          {
            backgroundColor: colors.bg.base,
            borderBottomColor: colors.border.DEFAULT,
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-4, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[header.searchBar, { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT }]}>
          <Feather name="search" size={15} color={colors.amber.DEFAULT} />
          <TextInput
            style={[header.searchInput, { color: colors.text.primary }]}
            placeholder="Buscar por tema, passagem ou marco..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
            returnKeyType="search"
            selectionColor={colors.amber.DEFAULT}
            accessibilityLabel="Buscar marcos"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={onClearSearch}
              style={header.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Limpar texto da busca"
            >
              <Feather name="x" size={14} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={onToggleSearch}
          style={header.cancelBtn}
          accessibilityRole="button"
          accessibilityLabel="Cancelar busca"
        >
          <Text style={[header.cancelBtnText, { color: colors.text.secondary }]}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[header.row, { opacity: fadeAnim, backgroundColor: colors.bg.base, borderBottomColor: colors.border.DEFAULT }]}>
      <Text style={[header.wordmark, { color: colors.text.primary }]} accessibilityRole="header">
        MEMORIAL
      </Text>
      <View style={header.actions}>
        <TouchableOpacity
          onPress={onToggleSearch}
          style={[header.iconBtn, { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT }]}
          accessibilityLabel="Buscar registros"
          accessibilityRole="button"
        >
          <Feather name="search" size={17} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAvatarPress}
          style={[header.avatar, { backgroundColor: colors.bg.raised, borderColor: colors.border.DEFAULT }]}
          accessibilityLabel="Perfil"
          accessibilityRole="button"
        >
          <Text style={[header.avatarInitial, { color: colors.amber.DEFAULT }]}>{initial}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function FilterPill({
  filter,
  isActive,
  onPress,
}: {
  filter: { key: Filter; label: string };
  isActive: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, tension: 400, friction: 10 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 350, friction: 10 }).start();
        }}
        style={[
          ls.pill,
          { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT },
          isActive && { backgroundColor: colors.bg.raised, borderColor: colors.amber.DEFAULT },
        ]}
        accessibilityRole="tab"
        accessibilityLabel={filter.label}
        accessibilityState={{ selected: isActive }}
      >
        <View style={ls.pillInnerRow}>
          {filter.key === 'respondidas' && (
            <Feather
              name="check"
              size={11}
              color={isActive ? colors.amber.DEFAULT : colors.text.muted}
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            style={[
              ls.pillText,
              { color: colors.text.secondary },
              isActive && { color: colors.amber.DEFAULT, fontWeight: typography.weight.semibold },
            ]}
          >
            {filter.label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const header = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing['5'],
    paddingVertical:   spacing['4'],
    backgroundColor:   colors.bg.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },
  wordmark: {
    color:         colors.text.primary,
    fontSize:      typography.size.base,
    fontWeight:    typography.weight.bold,
    letterSpacing: 3.5,
    fontFamily:    Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  actions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing['2'],
  },
  iconBtn: {
    width:           36,
    height:          36,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    10,
    backgroundColor: colors.bg.surface,
    borderWidth:     1,
    borderColor:     colors.border.DEFAULT,
  },
  avatar: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: colors.bg.raised,
    borderWidth:     1,
    borderColor:     colors.border.active,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: {
    color:      colors.amber.DEFAULT,
    fontSize:   14,
    fontWeight: typography.weight.bold,
  },
  searchRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing['4'],
    paddingVertical:   spacing['3'],
    backgroundColor:   colors.bg.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
    gap:               spacing['3'],
  },
  searchBar: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    height:            40,
    borderRadius:      radius.md,
    backgroundColor:   colors.bg.surface,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    paddingHorizontal: spacing['3'],
    gap:               spacing['2'],
  },
  searchInput: {
    flex:           1,
    color:          colors.text.primary,
    fontSize:       14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  cancelBtn: {
    paddingVertical:   8,
    paddingHorizontal: 4,
  },
  cancelBtnText: {
    color:    colors.text.secondary,
    fontSize: 14,
  },
});

function EbenezerCard({ count }: { count: number }) {
  const { colors } = useTheme();
  return (
    <View style={[eb.card, { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT }]}>
      <View style={eb.left}>
        <Text style={[eb.title, { color: colors.text.secondary }]}>EBENÉZER</Text>
        <Text style={[eb.verse, { color: colors.text.muted }]}>
          "Até aqui nos ajudou o Senhor." — 1 Samuel 7:12
        </Text>
      </View>
      <View style={eb.countWrap}>
        <Text style={[eb.count, { color: colors.text.primary }]}>{count}</Text>
        <Text style={[eb.countLabel, { color: colors.text.muted }]}>marcos</Text>
      </View>
    </View>
  );
}

const eb = StyleSheet.create({
  card: {
    backgroundColor:  colors.bg.surface,
    borderRadius:     radius.lg,
    borderWidth:      1,
    borderColor:      colors.border.DEFAULT,
    padding:          spacing['5'],
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    marginHorizontal: spacing['5'],
    marginBottom:     spacing['4'],
  },
  left: { flex: 1, gap: 4 },
  title: {
    color:         colors.text.secondary,
    fontSize:      11,
    fontWeight:    typography.weight.bold,
    letterSpacing: 1.5,
  },
  verse: {
    color:      colors.text.muted,
    fontSize:   typography.size.xs,
    lineHeight: 18,
    fontStyle:  'italic',
  },
  countWrap: {
    alignItems:  'flex-end',
    paddingLeft: spacing['3'],
  },
  count: {
    color:      colors.text.primary,
    fontSize:   typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  countLabel: {
    color:    colors.text.muted,
    fontSize: 10,
  },
});

function TimelineItem({
  entry,
  onPress,
  onAnswer,
  isLast,
  isNew,
}: {
  entry:    MemorialEntry;
  onPress:  () => void;
  onAnswer?: () => void;
  isLast:   boolean;
  isNew?:   boolean;
}) {
  const { colors } = useTheme();
  const enterAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? 12 : 0)).current;

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(enterAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 280,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew]);

  return (
    <Animated.View
      style={[
        item.row,
        {
          opacity: enterAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={item.axis}>
        <View style={[item.line, { backgroundColor: colors.border.DEFAULT }, isLast && item.lineHidden]} />
        <TimelineNode />
      </View>
      <View style={item.cardWrap}>
        <MemorialCard
          entry={entry}
          onPress={onPress}
          onAnswer={onAnswer}
        />
      </View>
    </Animated.View>
  );
}

const item = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingRight:  spacing['5'],
    paddingLeft:   spacing['3'],
  },
  axis: {
    alignItems: 'center',
    width:      36,
    flexShrink: 0,
  },
  line: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    left:            '50%',
    width:           1,
    backgroundColor: colors.border.DEFAULT,
    marginLeft:      -0.5,
  },
  lineHidden: { opacity: 0 },
  cardWrap: {
    flex:          1,
    paddingTop:    spacing['2'],
    paddingBottom: spacing['4'],
  },
});

interface Props { navigation?: any }

export function LinhasagradaScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [entries, setEntries] = useState<MemorialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('todos');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [userInitial, setUserInitial] = useState('L');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);
  const [sheetInitialContent, setSheetInitialContent] = useState('');
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // Acompanhamento preciso e instantâneo do teclado móvel (Android & iOS)
  useEffect(() => {
    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height || 0;
      if (h > 0) {
        Animated.timing(keyboardHeight, {
          toValue: h,
          duration: e?.duration && e.duration > 50 ? e.duration : 150,
          useNativeDriver: false,
        }).start();
      }
    };

    const onHide = (e: any) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: e?.duration && e.duration > 50 ? e.duration : 150,
        useNativeDriver: false,
      }).start();
    };

    const subShow1 = Keyboard.addListener('keyboardWillShow', onShow);
    const subShow2 = Keyboard.addListener('keyboardDidShow', onShow);
    const subHide1 = Keyboard.addListener('keyboardWillHide', onHide);
    const subHide2 = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      subShow1.remove();
      subShow2.remove();
      subHide1.remove();
      subHide2.remove();
    };
  }, []);

  const [syncInfo, setSyncInfo] = useState<SyncStateInfo>({
    status: 'local_only',
    lastSyncTime: null,
    pendingCount: 0,
    cloudCount: 0,
  });

  // Estado do Atalaia (Ecossistema dos 4 Pilares de Cuidado Pastoral)
  const [careBannerState, setCareBannerState] = useState<{
    visible: boolean;
    mode: 'acolhimento' | 'sugestao_sinal' | 'ecosystem_action';
    intent?: PastoralIntent;
    confidence?: number;
    pastorName?: string;
    noteId?: string;
    biblicalReference?: string;
  }>({
    visible: false,
    mode: 'acolhimento',
  });
  const [isSendingPastoralAction, setIsSendingPastoralAction] = useState(false);
  const [atalaiaModalVisible, setAtalaiaModalVisible] = useState(false);
  const [pastoralContact, setPastoralContact] = useState<PastoralContact | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: 'check' | 'mail' | 'send' | 'alert-circle' | 'shield';
    buttonText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadData = async () => {
    try {
      const data = await fetchUserMemorials();
      setEntries(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPastoralContact = async () => {
    try {
      const contact = await fetchCurrentPastoralContact();
      setPastoralContact(contact);
    } catch (e) {
      console.warn('[Linhasagrada] Erro ao carregar contato pastoral:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadPastoralContact();
    }, [])
  );

  useEffect(() => {
    loadData();
    loadPastoralContact();

    // Inscreve no gerenciador de sincronização em tempo real
    const unsubSync = subscribeToSyncState((state) => {
      setSyncInfo(state);
    });

    // Carrega inicial do avatar do Leitor autenticado
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email : 'L');
        setUserInitial(name.trim()[0].toUpperCase());
      }
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession?.user) {
        const name =
          currentSession.user.user_metadata?.full_name ||
          currentSession.user.user_metadata?.name ||
          (currentSession.user.email ? currentSession.user.email : 'L');
        setUserInitial(name.trim()[0].toUpperCase());
        loadData();
        loadPastoralContact();
      }
    });

    return () => {
      unsubSync();
      subscription.unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    try {
      const { entries: updated } = await syncMemorialsWithSupabase();
      if (updated && updated.length > 0) {
        setEntries(updated);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar manualmente:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { entries: updated } = await syncMemorialsWithSupabase();
      if (updated && updated.length > 0) {
        setEntries(updated);
      } else {
        await loadData();
      }
    } catch {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAnswered = async (id: string) => {
    try {
      const now = new Date().toISOString();
      await markPrayerAnsweredInSupabase(id);
      const target = entries.find((e) => e.id === id);

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, is_answered: true, answered_at: now } : e
        )
      );

      // Ecossistema dos 4 Pilares: Marcação explícita ativa pilar ANSWERED_PRAYER
      try {
        const contact = await fetchCurrentPastoralContact();
        setPastoralContact(contact);

        const classification = await classifyPastoralIntent({
          text: target?.content || '',
          title: target?.title,
          category: target?.category || 'oracao',
          is_answered: true,
          bible_ref: target?.bible_ref,
        });

        if (classification.intent) {
          updateMemorialPastoralIntent(id, classification).catch(() => {});
        }

        if (shouldShowPastoralActionBanner(classification, contact?.status)) {
          await clearCareBannerDismissal();
          setCareBannerState({
            visible: true,
            mode: 'ecosystem_action',
            intent: 'ANSWERED_PRAYER',
            confidence: classification.confidence,
            pastorName: contact?.name,
            noteId: id,
            biblicalReference: target?.bible_ref?.display,
          });
        }
      } catch (careErr) {
        console.warn('[Linhasagrada] Erro ao avaliar oração respondida:', careErr);
      }
    } catch (err) {
      console.warn('Erro ao marcar oração como respondida:', err);
    }
  };

  const filtered = searchMemorialEntries(
    entries,
    searchQuery,
    activeFilter,
    activeFilter === 'respondidas'
  );

  const handleCardPress = (entry: MemorialEntry) => {
    navigation?.navigate?.('MarcoDetalhe', { entry });
  };

  const handleOpenSheet = () => {
    setSheetInitialContent(quickText);
    setSheetVisible(true);
  };

  const handleOpenSheetFromQuick = () => {
    setSheetInitialContent(quickText);
    setSheetVisible(true);
  };

  const handleQuickRegister = async () => {
    const trimmed = quickText.trim();
    if (!trimmed || isQuickSubmitting) return;

    setIsQuickSubmitting(true);
    Keyboard.dismiss();

    const autoTitle = generateAutoTitle(trimmed);
    const entryPayload: Omit<MemorialEntry, 'id' | 'created_at'> = {
      title: autoTitle,
      content: trimmed,
      category: 'reflexao',
      is_answered: false,
      tags: [],
      ai_status: 'none',
    };

    setQuickText('');

    try {
      await handleSaveNewEntry(entryPayload);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err) {
      console.warn('[Linhasagrada] Erro ao registrar rapidamente:', err);
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const handleSaveNewEntry = async (data: Omit<MemorialEntry, 'id' | 'created_at'>) => {
    try {
      const saved = await saveUserMemorial(data);
      setNewlyCreatedId(saved.id);
      setEntries((prev) => [saved, ...prev.filter((e) => e.id !== saved.id)]);

      // Mapeamento teológico assíncrono em background (OpenAI + TypeSafe JEV)
      attachAiConnectionsToMemorial(saved.id, saved)
        .then((updated) => {
          setEntries((prev) => prev.map((e) => (e.id === saved.id ? updated : e)));
        })
        .catch((err) => {
          console.log('[Memorial] Análise de conexões em background concluída com aviso:', err);
        });

      // Avaliação do Ecossistema Completo de Cuidado Pastoral (4 Pilares)
      try {
        const contact = await fetchCurrentPastoralContact();
        setPastoralContact(contact);

        const classification = await classifyPastoralIntent({
          text: saved.content,
          title: saved.title,
          category: saved.category,
          is_answered: saved.is_answered,
          bible_ref: saved.bible_ref,
          tags: saved.tags,
        });

        console.log('[Linhasagrada] Classificação JEV (4 Pilares):', classification);

        // Se houver intenção identificada, atualiza no memorialStore (cache local + nuvem)
        if (classification.intent) {
          updateMemorialPastoralIntent(saved.id, classification).catch((err) =>
            console.log('[Memorial] Erro ao persistir intenção pastoral:', err)
          );
        }

        // Regra de interface: confidence >= 0.80 E pastor_status == 'active'
        const hasActivePastor = contact?.status === 'active';

        // 🚨 CASO SÉRIO: CRISIS (Depressão, aflição aguda ou perda de vontade de viver)
        // Exibe IMEDIATAMENTE o popup solene de intervenção e apoio à vida (CVV 188)
        if (classification.intent === 'CRISIS') {
          triggerGlobalAtalaiaCrisis({
            visible: true,
            pastorName: contact?.name,
            hasActivePastor,
            noteId: saved.id,
          });
        }

        if (shouldShowPastoralActionBanner(classification, contact?.status)) {
          await clearCareBannerDismissal();
          setCareBannerState({
            visible: true,
            mode: 'ecosystem_action',
            intent: classification.intent!,
            confidence: classification.confidence,
            pastorName: contact?.name,
            noteId: saved.id,
            biblicalReference: classification.biblical_reference || saved.bible_ref?.display,
          });
        } else if (classification.intent === 'CRISIS' && !hasActivePastor) {
          // Se for crise e não tiver pastor ativo, também mantém o banner de acolhimento na lista
          await clearCareBannerDismissal();
          setCareBannerState({
            visible: true,
            mode: 'acolhimento',
            intent: 'CRISIS',
            confidence: classification.confidence,
            noteId: saved.id,
          });
        }
      } catch (careErr) {
        console.warn('[Linhasagrada] Erro na triagem de cuidado pastoral:', careErr);
      }
    } catch (e) {
      console.warn('Erro ao salvar no Supabase:', e);
      const fallback: MemorialEntry = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        ai_status: 'none',
      };
      setNewlyCreatedId(fallback.id);
      setEntries((prev) => [fallback, ...prev]);
    }
  };

  const handleDismissCareBanner = async () => {
    setCareBannerState((prev) => ({ ...prev, visible: false }));
    await dismissCareBanner();
  };

  const handleConfigureCareContact = () => {
    setAtalaiaModalVisible(true);
  };

  const handleSendPastoralAction = async (intent: PastoralIntent) => {
    setIsSendingPastoralAction(true);
    try {
      const res = await sendPastoralEcosystemEmail({
        type: intent,
        noteId: careBannerState.noteId,
        biblicalReference: careBannerState.biblicalReference,
      });

      setCareBannerState((prev) => ({ ...prev, visible: false }));
      await dismissCareBanner();

      const pastorDisplay = careBannerState.pastorName || 'seu pastor';

      if (res.rateLimited) {
        setFeedbackDialog({
          visible: true,
          title: 'Notificação Já Enviada Recentemente',
          message:
            res.message ||
            `Um aviso recente já foi compartilhado com o Pr. ${pastorDisplay}. Respeitamos a janela pastoral.`,
          icon: 'alert-circle',
        });
      } else if (res.success) {
        let title = 'Notificação Enviada com Sucesso';
        let message = `Seu pastor (${pastorDisplay}) foi notificado com sucesso. Nenhuma anotação pessoal foi exposta.`;

        if (intent === 'CRISIS') {
          title = 'Sinal de Cuidado Enviado';
          message = `O Pr. ${pastorDisplay} foi avisado discretamente para orar por você e prestar amparo fraternal.`;
        } else if (intent === 'THEOLOGICAL_QUERY') {
          title = 'Dúvida de Estudo Enviada';
          message = `A dúvida de estudo sobre ${careBannerState.biblicalReference || 'a passagem bíblica'} foi enviada ao Pr. ${pastorDisplay} para enriquecer sua caminhada!`;
        } else if (intent === 'THANKSGIVING') {
          title = 'Ação de Graças Compartilhada';
          message = `Sua nota de vitória e gratidão a Deus foi enviada ao Pr. ${pastorDisplay} para renovar seu ministério!`;
        } else if (intent === 'ANSWERED_PRAYER') {
          title = 'Testemunho Compartilhado';
          message = `O testemunho da sua oração respondida foi notificado ao Pr. ${pastorDisplay} para celebrarem juntos!`;
        }

        setFeedbackDialog({
          visible: true,
          title,
          message,
          icon: 'send',
        });
      } else {
        setFeedbackDialog({
          visible: true,
          title: 'Não Foi Possível Enviar',
          message:
            res.message ||
            'Não foi possível enviar a mensagem no momento. Tente novamente mais tarde.',
          icon: 'alert-circle',
        });
      }
    } catch (_err: any) {
      setFeedbackDialog({
        visible: true,
        title: 'Não Foi Possível Enviar',
        message: 'Não foi possível enviar a notificação no momento. Tente novamente mais tarde.',
        icon: 'alert-circle',
      });
    } finally {
      setIsSendingPastoralAction(false);
    }
  };

  const handleRequestCareSignal = async () => {
    try {
      const res = await sendPastoralCareSignal({ noteId: careBannerState.noteId });
      setCareBannerState((prev) => ({ ...prev, visible: false }));
      await dismissCareBanner();

      if (res.rateLimited) {
        setFeedbackDialog({
          visible: true,
          title: 'Sinal Já Enviado Recentemente',
          message:
            res.message ||
            'Um sinal de oração já foi enviado para seu contato pastoral recentemente. Respeitamos a janela pastoral.',
          icon: 'alert-circle',
        });
      } else if (res.success) {
        setFeedbackDialog({
          visible: true,
          title: 'Sinal de Cuidado Enviado',
          message: `Seu contato pastoral (${careBannerState.pastorName || 'cadastrado'}) foi avisado discretamente para orar por você e puxar conversa com carinho. Nenhuma palavra de seu memorial foi enviada.`,
          icon: 'send',
        });
      } else {
        setFeedbackDialog({
          visible: true,
          title: 'Não Foi Possível Enviar',
          message:
            res.message ||
            'Não foi possível enviar o sinal no momento. Tente novamente mais tarde.',
          icon: 'alert-circle',
        });
      }
    } catch (_err: any) {
      setFeedbackDialog({
        visible: true,
        title: 'Não Foi Possível Enviar',
        message: 'Não foi possível enviar o sinal no momento. Tente novamente mais tarde.',
        icon: 'alert-circle',
      });
    }
  };

  const handleExplicitCareHelp = async () => {
    try {
      const res = await sendExplicitHelpRequest();
      setCareBannerState((prev) => ({ ...prev, visible: false }));
      await dismissCareBanner();

      if (res.rateLimited) {
        setFeedbackDialog({
          visible: true,
          title: 'Pedido Já Enviado Hoje',
          message:
            res.message ||
            'Você já enviou um pedido de conversa hoje. Seu contato foi notificado e entrará em contato.',
          icon: 'alert-circle',
        });
      } else if (res.success) {
        setFeedbackDialog({
          visible: true,
          title: 'Pedido de Conversa Enviado',
          message: `Um aviso prioritário foi enviado para seu contato pastoral (${careBannerState.pastorName || 'cadastrado'}). Ele entrará em contato com você com carinho assim que possível.`,
          icon: 'check',
        });
      } else {
        setFeedbackDialog({
          visible: true,
          title: 'Não Foi Possível Enviar',
          message:
            res.message ||
            'Não foi possível enviar o pedido de amparo no momento. Tente novamente mais tarde.',
          icon: 'alert-circle',
        });
      }
    } catch (_err: any) {
      setFeedbackDialog({
        visible: true,
        title: 'Não Foi Possível Enviar',
        message: 'Não foi possível enviar o pedido no momento. Tente novamente mais tarde.',
        icon: 'alert-circle',
      });
    }
  };

  const ListHeader = () => (
    <View style={ls.listHeader}>
      {careBannerState.visible && (
        careBannerState.mode === 'ecosystem_action' && careBannerState.intent ? (
          <PastoralCareActionBanner
            intent={careBannerState.intent}
            confidence={careBannerState.confidence || 0.9}
            pastorName={careBannerState.pastorName || 'Pastor'}
            biblicalReference={careBannerState.biblicalReference}
            onSend={handleSendPastoralAction}
            onDismiss={handleDismissCareBanner}
            isSending={isSendingPastoralAction}
            containerStyle={ls.bannerSpacing}
          />
        ) : (
          <PastoralCareBanner
            mode={careBannerState.mode === 'sugestao_sinal' ? 'sugestao_sinal' : 'acolhimento'}
            pastorName={careBannerState.pastorName}
            onDismiss={handleDismissCareBanner}
            onConfigureContact={handleConfigureCareContact}
            onRequestSignal={handleRequestCareSignal}
            onExplicitHelp={handleExplicitCareHelp}
            containerStyle={ls.bannerSpacing}
          />
        )
      )}
      <EbenezerCard count={entries.length} />

      {/* Filtros por Categoria e Status */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ls.filtersRow}
        renderItem={({ item: f }) => {
          const isActive = activeFilter === f.key;
          return (
            <FilterPill
              filter={f}
              isActive={isActive}
              onPress={() => setActiveFilter(f.key)}
            />
          );
        }}
      />

      {/* Indicador solene de busca ativa */}
      {searchQuery.trim().length > 0 && (
        <View style={[ls.searchFeedbackRow, { backgroundColor: colors.amber.muted, borderColor: colors.border.active }]}>
          <View style={ls.searchFeedbackLeft}>
            <Feather name="search" size={13} color={colors.amber.DEFAULT} />
            <Text style={[ls.searchFeedbackText, { color: colors.text.secondary }]}>
              {filtered.length}{' '}
              {filtered.length === 1 ? 'marco encontrado' : 'marcos encontrados'} para{' '}
              <Text style={[ls.searchFeedbackQuery, { color: colors.amber.DEFAULT }]}>"{searchQuery.trim()}"</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={ls.clearSearchPill}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
          >
            <Text style={[ls.clearSearchPillText, { color: colors.amber.DEFAULT }]}>Limpar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={ls.sectionHeader}>
        <View style={[ls.sectionLine, { backgroundColor: colors.border.DEFAULT }]} />
        <Text style={[ls.sectionTitle, { color: colors.text.muted }]}>
          {searchQuery.trim().length > 0 ? 'RESULTADOS DA BUSCA' : 'LINHA TEMPORAL'}
        </Text>
        <View style={[ls.sectionLine, { backgroundColor: colors.border.DEFAULT }]} />
      </View>
    </View>
  );

  return (
    <View style={[ls.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar hidden={true} />

      <ScreenHeader
        onAvatarPress={() => navigation?.navigate?.('Perfil')}
        onToggleSearch={() => {
          if (isSearchOpen) {
            setIsSearchOpen(false);
            setSearchQuery('');
          } else {
            setIsSearchOpen(true);
          }
        }}
        isSearchOpen={isSearchOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        onSyncPress={handleManualSync}
        syncInfo={syncInfo}
        initial={userInitial}
      />

      {isSearchOpen && (
        <SuggestedThemesBar
          activeQuery={searchQuery}
          onSelectTheme={(theme) => setSearchQuery(theme)}
        />
      )}

      <PastoralOnboardingBanner
        visible={!loading && !pastoralContact && !isSearchOpen}
        onLinkPastor={() => setAtalaiaModalVisible(true)}
      />

      {loading && entries.length === 0 ? (
        <View style={ls.loadingContainer}>
          <ActivityIndicator color={colors.amber.DEFAULT} size="small" />
          <Text style={ls.loadingText}>Carregando seus marcos espirituais…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <FlatList
          ref={flatListRef}
          data={[]}
          renderItem={null}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              <ListHeader />
              {entries.length === 0 ? (
                <EmptyState onAdd={handleOpenSheet} />
              ) : (
                <SearchEmptyState
                  query={searchQuery}
                  activeFilter={activeFilter}
                  onClear={() => {
                    setSearchQuery('');
                    setActiveFilter('todos');
                  }}
                  onOpenBibleSearch={() =>
                    navigation?.navigate?.('Busca', { initialQuery: searchQuery })
                  }
                />
              )}
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.amber.DEFAULT}
            />
          }
          contentContainerStyle={ls.listContent}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={filtered}
          keyExtractor={(e) => e.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<ListHeader />}
          renderItem={({ item: entry, index }) => (
            <TimelineItem
              entry={entry}
              onPress={() => handleCardPress(entry)}
              onAnswer={
                entry.category === 'oracao' && !entry.is_answered
                  ? () => handleMarkAnswered(entry.id)
                  : undefined
              }
              isLast={index === filtered.length - 1}
              isNew={entry.id === newlyCreatedId}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.amber.DEFAULT}
            />
          }
          contentContainerStyle={ls.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={10}
        />
      )}

      {/* Caixa de Captura Rápida Docked no Rodapé — Elevação Suave e Precisa Sobre o Teclado */}
      <Animated.View
        style={[
          ls.bottomDockContainer,
          {
            bottom: keyboardHeight,
          },
        ]}
        pointerEvents="box-none"
      >
        <BottomQuickCaptureBar
          value={quickText}
          onChangeText={setQuickText}
          onSubmit={handleQuickRegister}
          onOpenFullSheet={handleOpenSheetFromQuick}
          onError={(title, message) => {
            setFeedbackDialog({
              visible: true,
              title,
              message,
              icon: 'alert-circle',
            });
          }}
          isSubmitting={isQuickSubmitting}
        />
      </Animated.View>

      <NovoRegistroSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setSheetInitialContent('');
        }}
        onSave={(data) => {
          setQuickText('');
          setSheetInitialContent('');
          handleSaveNewEntry(data);
        }}
        initialContent={sheetInitialContent}
      />

      <AtalaiaContactModal
        visible={atalaiaModalVisible}
        onClose={() => setAtalaiaModalVisible(false)}
        currentContact={pastoralContact}
        onContactUpdated={async () => {
          const contact = await fetchCurrentPastoralContact();
          setPastoralContact(contact);
        }}
      />

      {feedbackDialog.visible && (
        <View style={ls.feedbackOverlay}>
          <Pressable
            style={ls.feedbackBackdrop}
            onPress={() => setFeedbackDialog((prev) => ({ ...prev, visible: false }))}
          />
          <View
            style={[
              ls.feedbackDialogBox,
              {
                backgroundColor: colors.bg.surface,
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <View
              style={[
                ls.feedbackIconBox,
                feedbackDialog.icon === 'alert-circle'
                  ? { backgroundColor: isDark ? '#3D1C1F' : '#FDE8E8' }
                  : { backgroundColor: isDark ? '#2B261D' : '#F7EBDC' },
              ]}
            >
              <Feather
                name={feedbackDialog.icon || 'check'}
                size={24}
                color={
                  feedbackDialog.icon === 'alert-circle'
                    ? colors.error
                    : colors.amber.DEFAULT
                }
              />
            </View>
            <Text style={[ls.feedbackTitle, { color: colors.text.primary }]}>
              {feedbackDialog.title}
            </Text>
            <Text style={[ls.feedbackMessage, { color: colors.text.secondary }]}>
              {feedbackDialog.message}
            </Text>
            <TouchableOpacity
              onPress={() => setFeedbackDialog((prev) => ({ ...prev, visible: false }))}
              style={[ls.feedbackPrimaryBtn, { backgroundColor: colors.amber.DEFAULT }]}
              activeOpacity={0.8}
            >
              <Text style={[ls.feedbackPrimaryBtnText, { color: colors.text.onAmber }]}>
                {feedbackDialog.buttonText || 'Entendido'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const ls = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg.base,
  },
  loadingContainer: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing['12'],
    gap:             spacing['3'],
  },
  loadingText: {
    color:     colors.text.muted,
    fontSize:  typography.size.sm,
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: 140,
  },
  bottomDockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  listHeader: {
    paddingTop: spacing['4'],
  },
  filtersRow: {
    paddingHorizontal: spacing['5'],
    gap:               spacing['2'],
    paddingBottom:     spacing['4'],
  },
  pill: {
    paddingHorizontal: spacing['4'],
    paddingVertical:   7,
    borderRadius:      radius.full,
    backgroundColor:   colors.bg.surface,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
  },
  pillActive: {
    backgroundColor: colors.bg.raised,
    borderColor:     colors.amber.DEFAULT,
  },
  pillInnerRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  pillText: {
    color:    colors.text.secondary,
    fontSize: 13,
  },
  pillTextActive: {
    color:      colors.amber.DEFAULT,
    fontWeight: typography.weight.semibold,
  },
  searchFeedbackRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginHorizontal:  spacing['5'],
    marginBottom:      spacing['3'],
    paddingVertical:   8,
    paddingHorizontal: 12,
    borderRadius:      radius.md,
    backgroundColor:   'rgba(217, 180, 99, 0.08)',
    borderWidth:       1,
    borderColor:       'rgba(217, 180, 99, 0.22)',
  },
  searchFeedbackLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    flex:          1,
  },
  searchFeedbackText: {
    color:    colors.text.secondary,
    fontSize: 12,
  },
  searchFeedbackQuery: {
    color:      colors.amber.DEFAULT,
    fontWeight: typography.weight.semibold,
  },
  clearSearchPill: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    backgroundColor:   'rgba(217, 180, 99, 0.15)',
  },
  clearSearchPillText: {
    color:      colors.amber.DEFAULT,
    fontSize:   11,
    fontWeight: typography.weight.semibold,
  },
  sectionHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing['3'],
    paddingHorizontal: spacing['5'],
    marginBottom:      spacing['3'],
  },
  sectionLine: {
    flex:            1,
    height:          StyleSheet.hairlineWidth,
    backgroundColor: colors.border.DEFAULT,
  },
  sectionTitle: {
    color:         colors.text.muted,
    fontSize:      10,
    fontWeight:    typography.weight.semibold,
    letterSpacing: 1.5,
  },
  bannerSpacing: {
    marginHorizontal: spacing['5'],
    marginBottom:     spacing['4'],
  },
  feedbackOverlay: {
    position:          'absolute',
    top:               0,
    left:              0,
    right:             0,
    bottom:            0,
    zIndex:            9999,
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: spacing['6'],
  },
  feedbackBackdrop: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  feedbackDialogBox: {
    width:        '100%',
    maxWidth:     380,
    borderRadius: radius.xl,
    borderWidth:  1,
    padding:      spacing['6'],
    alignItems:   'center',
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius:  16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  feedbackIconBox: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing['3'],
  },
  feedbackTitle: {
    fontSize:     17,
    fontWeight:   '600',
    fontFamily:   Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign:    'center',
    marginBottom: spacing['2'],
  },
  feedbackMessage: {
    fontSize:     13.5,
    lineHeight:   20,
    textAlign:    'center',
    marginBottom: spacing['5'],
  },
  feedbackPrimaryBtn: {
    width:          '100%',
    borderRadius:   radius.md,
    paddingVertical: 13,
    alignItems:     'center',
    justifyContent: 'center',
  },
  feedbackPrimaryBtnText: {
    fontSize:   14,
    fontWeight: '600',
  },
});


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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme, colors, ColorTokens, typography, spacing, radius } from '../../theme';
import { MemorialCard } from '../../components/memorial/MemorialCard';
import { NovoRegistroSheet } from '../../components/memorial/NovoRegistroSheet';
import { FAB } from '../../components/ui/FAB';
import { MemorialEntry } from '../../lib/types';
import { MemorialCategory, supabase } from '../../lib/supabase';
import {
  fetchUserMemorials,
  syncMemorialsWithSupabase,
  saveUserMemorial,
  markPrayerAnsweredInSupabase,
  subscribeToSyncState,
  SyncStateInfo,
} from '../../lib/memorialStore';
import { attachAiConnectionsToMemorial } from '../../lib/aiConnectionService';
import { searchMemorialEntries, SUGGESTED_THEMES } from '../../lib/searchService';
import { PastoralCareBanner } from '../../components/memorial/PastoralCareBanner';
import { AtalaiaContactModal } from '../../components/memorial/AtalaiaContactModal';
import { PastoralContact } from '../../lib/atalaiaTypes';
import {
  fetchCurrentPastoralContact,
  evaluateCareTriage,
  canShowCareBanner,
  dismissCareBanner,
  clearCareBannerDismissal,
  sendPastoralCareSignal,
  sendExplicitHelpRequest,
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
  onSyncPress: () => void;
  syncInfo: SyncStateInfo;
  initial?: string;
}) {
  const { colors } = useTheme();
  const isSyncing = syncInfo.status === 'syncing';
  const isSynced = syncInfo.status === 'synced';
  const isOffline = syncInfo.status === 'offline';

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
        {/* Indicador e gatilho de sincronização em nuvem */}
        <TouchableOpacity
          onPress={onSyncPress}
          style={[
            header.syncBtn,
            { backgroundColor: colors.bg.surface, borderColor: colors.border.DEFAULT },
            isSyncing && header.syncBtnActive,
            isSynced && header.syncBtnSynced,
          ]}
          disabled={isSyncing}
          activeOpacity={0.7}
          accessibilityLabel="Sincronizar com a nuvem"
          accessibilityRole="button"
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.amber.DEFAULT} style={{ transform: [{ scale: 0.7 }] }} />
          ) : isSynced ? (
            <Feather name="cloud" size={13} color={colors.amber.DEFAULT} />
          ) : isOffline ? (
            <Feather name="cloud-off" size={13} color={colors.text.muted} />
          ) : (
            <Feather name="cloud" size={13} color={colors.text.muted} />
          )}

          <Text
            style={[
              header.syncText,
              { color: colors.text.muted },
              isSynced && { color: colors.amber.DEFAULT },
              isSyncing && { color: colors.amber.DEFAULT },
            ]}
          >
            {isSyncing
              ? 'Sincronizando'
              : isSynced
              ? 'Nuvem ativa'
              : syncInfo.pendingCount > 0
              ? `${syncInfo.pendingCount} pendente`
              : 'Local'}
          </Text>
        </TouchableOpacity>

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
  syncBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingHorizontal: 8,
    height:          32,
    borderRadius:    radius.sm,
    backgroundColor: colors.bg.surface,
    borderWidth:     1,
    borderColor:     colors.border.DEFAULT,
  },
  syncBtnActive: {
    borderColor: colors.amber.DEFAULT,
  },
  syncBtnSynced: {
    borderColor: 'rgba(217, 180, 99, 0.35)',
    backgroundColor: 'rgba(217, 180, 99, 0.06)',
  },
  syncText: {
    color:      colors.text.muted,
    fontSize:   10,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.3,
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
}: {
  entry:    MemorialEntry;
  onPress:  () => void;
  onAnswer?: () => void;
  isLast:   boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={item.row}>
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
    </View>
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
  const [syncInfo, setSyncInfo] = useState<SyncStateInfo>({
    status: 'local_only',
    lastSyncTime: null,
    pendingCount: 0,
    cloudCount: 0,
  });

  // Estado do Atalaia (Cuidado Pastoral & Triagem Discreta)
  const [careBannerState, setCareBannerState] = useState<{
    visible: boolean;
    mode: 'acolhimento' | 'sugestao_sinal';
    pastorName?: string;
    noteId?: string;
  }>({
    visible: false,
    mode: 'acolhimento',
  });
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
      await markPrayerAnsweredInSupabase(id);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, is_answered: true, answered_at: new Date().toISOString() } : e
        )
      );
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

  const handleOpenSheet = () => setSheetVisible(true);

  const handleSaveNewEntry = async (data: Omit<MemorialEntry, 'id' | 'created_at'>) => {
    try {
      const saved = await saveUserMemorial(data);
      setEntries((prev) => [saved, ...prev.filter((e) => e.id !== saved.id)]);

      // Mapeamento teológico assíncrono em background (OpenAI + TypeSafe JEV)
      attachAiConnectionsToMemorial(saved.id, saved)
        .then((updated) => {
          setEntries((prev) => prev.map((e) => (e.id === saved.id ? updated : e)));
        })
        .catch((err) => {
          console.log('[Memorial] Análise de conexões em background concluída com aviso:', err);
        });

      // Avaliação de Triagem de Cuidado Pastoral (Atalaia)
      try {
        const evalText = `${saved.title ? saved.title + '\n' : ''}${saved.content || ''}`;
        console.log('[Linhasagrada] Avaliando triagem de cuidado para o registro recém-criado...');
        const isEligible = await evaluateCareTriage({
          text: evalText,
          createdAt: saved.created_at,
          category: saved.category,
        });
        console.log('[Linhasagrada] Resultado da triagem pastoral:', isEligible);

        if (isEligible) {
          await clearCareBannerDismissal();
          const contact = await fetchCurrentPastoralContact();
          setPastoralContact(contact);
          setCareBannerState({
            visible: true,
            mode: contact?.status === 'active' ? 'sugestao_sinal' : 'acolhimento',
            pastorName: contact?.name,
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
            'Houve um erro de conexão ao enviar o sinal pastoral. Tente novamente mais tarde.',
          icon: 'alert-circle',
        });
      }
    } catch (err: any) {
      setFeedbackDialog({
        visible: true,
        title: 'Erro de Envio',
        message: err?.message || 'Falha ao despachar sinal de cuidado pastoral.',
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
            'Houve um erro de conexão ao enviar o pedido de amparo.',
          icon: 'alert-circle',
        });
      }
    } catch (err: any) {
      setFeedbackDialog({
        visible: true,
        title: 'Erro de Envio',
        message: err?.message || 'Falha ao despachar pedido pastoral.',
        icon: 'alert-circle',
      });
    }
  };

  const ListHeader = () => (
    <View style={ls.listHeader}>
      {careBannerState.visible && (
        <PastoralCareBanner
          mode={careBannerState.mode}
          pastorName={careBannerState.pastorName}
          onDismiss={handleDismissCareBanner}
          onConfigureContact={handleConfigureCareContact}
          onRequestSignal={handleRequestCareSignal}
          onExplicitHelp={handleExplicitCareHelp}
          containerStyle={ls.bannerSpacing}
        />
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

      {loading && entries.length === 0 ? (
        <View style={ls.loadingContainer}>
          <ActivityIndicator color={colors.amber.DEFAULT} size="small" />
          <Text style={ls.loadingText}>Carregando seus marcos espirituais…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
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
          data={filtered}
          keyExtractor={(e) => e.id}
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

      <FAB onPress={handleOpenSheet} />

      <NovoRegistroSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={handleSaveNewEntry}
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
    paddingBottom: 120,
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


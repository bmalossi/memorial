import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Share,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';
import { MemorialEntry } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import {
  fetchUserMemorials,
  syncMemorialsWithSupabase,
  subscribeToSyncState,
  SyncStateInfo,
} from '../../lib/memorialStore';
import { relativeDate } from '../../lib/utils';
import { ActionSheetModal, ActionSheetItem, ConfirmModal } from '../../components/ui';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  registerPushTokenWithSupabase,
  triggerInstantTestReminder,
  NotificationSettings,
  PRESET_TIMES,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../lib/notificationService';
import { AtalaiaContactModal } from '../../components/memorial/AtalaiaContactModal';
import { PastoralContact } from '../../lib/atalaiaTypes';
import { fetchCurrentPastoralContact } from '../../lib/atalaiaStore';

interface Props {
  navigation?: any;
}

export function PerfilScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode, colors, isDark } = useTheme();

  const [userName, setUserName] = useState('Leitor da Palavra');
  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('LP');
  const [entries, setEntries] = useState<MemorialEntry[]>([]);
  const [syncInfo, setSyncInfo] = useState<SyncStateInfo>({
    status: 'local_only',
    lastSyncTime: null,
    pendingCount: 0,
    cloudCount: 0,
  });
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const [bibleVersion, setBibleVersion] = useState<'acf' | 'arc' | 'nvi'>('acf');
  const [fontSize, setFontSize] = useState<'15' | '17' | '20'>('17');

  // Modais Editoriais (Substituem Alert.alert genéricos)
  const [bibleVersionModalVisible, setBibleVersionModalVisible] = useState(false);
  const [fontSizeModalVisible, setFontSizeModalVisible] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [syncInfoModal, setSyncInfoModal] = useState<{
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

  // Estado de Notificações Diárias e Push Bíblia Vive
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notifTimeSheetVisible, setNotifTimeSheetVisible] = useState(false);
  const [notifSoftAskVisible, setNotifSoftAskVisible] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  // Estado do Atalaia (Cuidado Pastoral)
  const [pastoralContact, setPastoralContact] = useState<PastoralContact | null>(null);
  const [atalaiaModalVisible, setAtalaiaModalVisible] = useState(false);

  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const loadUserData = async () => {
    try {
      getNotificationSettings().then(setNotifSettings);
      fetchCurrentPastoralContact().then(setPastoralContact);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split('@')[0] : 'Leitor da Palavra');
        setUserName(name);
        setUserEmail(user.email || '');

        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
          setUserInitials((parts[0][0] + parts[1][0]).toUpperCase());
        } else if (parts[0]) {
          setUserInitials(parts[0].slice(0, 2).toUpperCase());
        }
      }

      const userEntries = await fetchUserMemorials();
      setEntries(userEntries);
    } catch (e) {
      console.warn('Erro ao carregar dados do perfil:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  useEffect(() => {
    loadUserData();
    const unsub = subscribeToSyncState((state) => {
      setSyncInfo(state);
    });
    return unsub;
  }, []);

  // Cálculos dinâmicos baseados nos marcos reais do usuário
  const totalMarcos = entries.length;
  const oracoesRespondidas = entries.filter(
    (e) => e.category === 'oracao' && e.is_answered
  ).length;

  const livrosUnicos = new Set(
    entries.map((e) => e.bible_ref?.book).filter(Boolean)
  ).size;

  const handleReviewAnsweredPrayers = () => {
    navigation?.navigate?.('Busca');
  };

  const bibleVersionItems: ActionSheetItem[] = [
    {
      id: 'acf',
      label: 'Almeida Corrigida Fiel (ACF)',
      description: 'Tradução formal e fidedigna ao Textus Receptus',
      icon: 'book-open',
      selected: bibleVersion === 'acf',
      onPress: () => setBibleVersion('acf'),
    },
    {
      id: 'arc',
      label: 'Almeida Revista e Corrigida (ARC)',
      description: 'Tradução clássica histórica em língua portuguesa',
      icon: 'book-open',
      selected: bibleVersion === 'arc',
      onPress: () => setBibleVersion('arc'),
    },
    {
      id: 'nvi',
      label: 'Nova Versão Internacional (NVI)',
      description: 'Linguagem contemporânea com clareza e fluidez',
      icon: 'book-open',
      selected: bibleVersion === 'nvi',
      onPress: () => setBibleVersion('nvi'),
    },
  ];

  const fontSizeItems: ActionSheetItem[] = [
    {
      id: '15',
      label: 'Compacto (15px)',
      description: 'Densidade máxima para visualização de mais versículos na página',
      icon: 'type',
      selected: fontSize === '15',
      onPress: () => setFontSize('15'),
    },
    {
      id: '17',
      label: 'Médio (17px) — Padrão',
      description: 'Escala ideal e equilibrada para leitura e contemplação contínua',
      icon: 'type',
      selected: fontSize === '17',
      onPress: () => setFontSize('17'),
    },
    {
      id: '20',
      label: 'Amplo (20px)',
      description: 'Tipografia ampla para imersão focada e descanso visual',
      icon: 'type',
      selected: fontSize === '20',
      onPress: () => setFontSize('20'),
    },
  ];

  const handleSelectBibleVersion = () => {
    setBibleVersionModalVisible(true);
  };

  const handleSelectFontSize = () => {
    setFontSizeModalVisible(true);
  };

  const handleExportJournal = async () => {
    try {
      const header = '══════════════════════════════════════\n     MEMORIAL — CADERNO ESPIRITUAL\n  "Até aqui nos ajudou o Senhor" (1 Sm 7:12)\n══════════════════════════════════════\n\n';

      const entriesText = entries.map((e, i) => {
        const dateStr = new Date(e.created_at).toLocaleDateString('pt-BR');
        return [
          `[${i + 1}] ${e.category.toUpperCase()} · ${dateStr}`,
          e.title ? `Título: ${e.title}` : '',
          e.bible_ref ? `Passagem: ${e.bible_ref.display}` : '',
          `Relato:\n${e.content}`,
          e.tags?.length ? `Tags: ${e.tags.map((t) => `#${t}`).join(' ')}` : '',
          '──────────────────────────────────────',
        ]
          .filter(Boolean)
          .join('\n');
      }).join('\n\n');

      await Share.share({
        message: header + entriesText,
        title: 'Memorial — Caderno de Experiências Espirituais',
      });
    } catch {}
  };

  const handleTriggerSync = async () => {
    try {
      setIsSyncingManual(true);
      const { entries: updated } = await syncMemorialsWithSupabase();
      if (updated && updated.length > 0) {
        setEntries(updated);
      }
      setSyncInfoModal({
        visible: true,
        title: 'Sincronização Concluída',
        message: 'Seus marcos de fé e conexões com a Palavra estão sincronizados com a nuvem do Bíblia Vive.',
        icon: 'cloud',
      });
    } catch (e: any) {
      setSyncInfoModal({
        visible: true,
        title: 'Falha na Sincronização',
        message: 'Não foi possível sincronizar suas memórias com a nuvem no momento. Verifique sua conexão com a internet.',
        icon: 'alert-circle',
        destructive: true,
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      setNotifSoftAskVisible(true);
    } else {
      const updated = await saveNotificationSettings({ enabled: false });
      setNotifSettings(updated);
    }
  };

  const handleConfirmEnableNotifications = async () => {
    setNotifSoftAskVisible(false);
    const granted = await requestNotificationPermission();
    if (!granted) {
      setSyncInfoModal({
        visible: true,
        title: 'Permissão Necessária',
        message: 'Para receber os lembretes diários dos seus marcos de fé, autorize as notificações nas configurações do seu celular.',
        icon: 'bell-off',
        destructive: true,
      });
      return;
    }

    const token = await registerPushTokenWithSupabase();
    const updated = await saveNotificationSettings({
      enabled: true,
      pushTokenRegistered: !!token,
      lastToken: token,
    });
    setNotifSettings(updated);

    setSyncInfoModal({
      visible: true,
      title: 'Lembretes de Fé Ativados',
      message: `Tudo pronto! Você receberá diariamente às ${updated.time} uma recordação contemplativa dos seus marcos e versículos.`,
      icon: 'bell',
    });
  };

  const handleSelectNotificationTime = () => {
    setNotifTimeSheetVisible(true);
  };

  const handleSetNotificationTime = async (timeId: string) => {
    const updated = await saveNotificationSettings({ time: timeId });
    setNotifSettings(updated);
  };

  const notifTimeItems: ActionSheetItem[] = PRESET_TIMES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    icon: 'clock',
    selected: notifSettings.time === t.id,
    onPress: () => handleSetNotificationTime(t.id),
  }));

  const handleTestNotificationNow = async () => {
    try {
      setIsTestingNotif(true);
      const sent = await triggerInstantTestReminder(entries);
      if (sent) {
        setSyncInfoModal({
          visible: true,
          title: 'Lembrete Enviado',
          message: 'Um marco de fé de demonstração foi disparado para o seu aparelho. Veja a barra de notificações nos próximos segundos!',
          icon: 'send',
        });
      } else {
        setSyncInfoModal({
          visible: true,
          title: 'Notificação Bloqueada',
          message: 'Não foi possível disparar o teste. Certifique-se de autorizar as notificações nas configurações do seu aparelho.',
          icon: 'alert-circle',
          destructive: true,
        });
      }
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleSignOut = () => {
    setSignOutConfirmVisible(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      setSignOutConfirmVisible(false);
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Perfil] Erro ao deslogar:', e);
      setSignOutConfirmVisible(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  const versionLabels: Record<string, string> = {
    acf: 'Almeida Corrigida Fiel (ACF)',
    arc: 'Almeida Revista e Corrigida (ARC)',
    nvi: 'Nova Versão Internacional (NVI)',
  };

  const fontSizeLabels: Record<string, string> = {
    '15': 'Compacto (15px)',
    '17': 'Médio (17px)',
    '20': 'Amplo (20px)',
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar hidden={true} />

      {/* Top Header */}
      <View style={s.topHeader}>
        <Text style={s.wordmark}>JORNADA ESPIRITUAL</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cartão do Leitor ── */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarInitials}>{userInitials}</Text>
          </View>
          <View style={s.profileMeta}>
            <Text style={s.profileName}>{userName}</Text>
            <Text style={s.profileSubtitle}>
              {userEmail ? `${userEmail} · ` : ''}Leitor da Palavra
            </Text>
          </View>
        </View>

        {/* ── Métricas Editoriais de Fé (3 colunas sóbrias) ── */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNumber}>{totalMarcos}</Text>
            <Text style={s.statLabel}>MARCOS DE FÉ</Text>
          </View>

          <View style={[s.statBox, s.statBoxHighlight]}>
            <Text style={[s.statNumber, s.statNumberHighlight]}>
              {oracoesRespondidas}
            </Text>
            <Text style={s.statLabel}>ORAÇÕES ATENDIDAS</Text>
          </View>

          <View style={s.statBox}>
            <Text style={s.statNumber}>{livrosUnicos}</Text>
            <Text style={s.statLabel}>LIVROS BÍBLICOS</Text>
          </View>
        </View>

        {/* ── Altar Ebenézer (Orações Respondidas) ── */}
        <View style={s.altarCard}>
          <View style={s.altarHeader}>
            <View style={s.altarIconBox}>
              <Feather name="bookmark" size={18} color={colors.amber.DEFAULT} />
            </View>
            <View style={s.altarTextWrap}>
              <Text style={s.altarTitle}>Altar de Orações Respondidas</Text>
              <Text style={s.altarQuote}>
                "Até aqui nos ajudou o Senhor." — 1 Samuel 7:12
              </Text>
            </View>
          </View>

          <Text style={s.altarDescription}>
            Cada marco registrado é um testemunho vivo contra o esquecimento da bondade divina em sua história.
          </Text>

          <TouchableOpacity
            onPress={handleReviewAnsweredPrayers}
            style={s.altarAction}
            activeOpacity={0.75}
          >
            <Text style={s.altarActionText}>Revisar respostas de oração</Text>
            <Feather name="arrow-right" size={13} color={colors.amber.DEFAULT} />
          </TouchableOpacity>
        </View>

        {/* ── APARÊNCIA & TEMA (Modo Escuro / Modo White Marfim) ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>APARÊNCIA & TEMA</Text>
          <View style={s.themeSelectorRow}>
            {/* Opção Escuro Contemplativo */}
            <TouchableOpacity
              onPress={() => setThemeMode('dark')}
              activeOpacity={0.8}
              style={[
                s.themeOptionCard,
                isDark && s.themeOptionCardActive,
              ]}
            >
              <View style={s.themeOptionHeader}>
                <View style={[s.themeColorBadge, { backgroundColor: '#18171D', borderColor: isDark ? colors.amber.DEFAULT : '#35323F' }]}>
                  <View style={[s.themeColorDot, { backgroundColor: '#E7B075' }]} />
                </View>
                {isDark ? (
                  <View style={s.activeBadge}>
                    <Feather name="check" size={12} color={colors.text.onAmber} />
                  </View>
                ) : null}
              </View>
              <Text style={[s.themeOptionTitle, isDark && s.themeOptionTitleActive]}>
                Escuro Contemplativo
              </Text>
              <Text style={s.themeOptionSubtitle}>
                Solene e meditativo para leitura noturna
              </Text>
            </TouchableOpacity>

            {/* Opção Branco Marfim / Pergaminho Sagrado */}
            <TouchableOpacity
              onPress={() => setThemeMode('light')}
              activeOpacity={0.8}
              style={[
                s.themeOptionCard,
                !isDark && s.themeOptionCardActive,
              ]}
            >
              <View style={s.themeOptionHeader}>
                <View style={[s.themeColorBadge, { backgroundColor: '#F7F5F0', borderColor: !isDark ? colors.amber.DEFAULT : '#E2DCD0' }]}>
                  <View style={[s.themeColorDot, { backgroundColor: '#B87E28' }]} />
                </View>
                {!isDark ? (
                  <View style={s.activeBadge}>
                    <Feather name="check" size={12} color={colors.text.onAmber} />
                  </View>
                ) : null}
              </View>
              <Text style={[s.themeOptionTitle, !isDark && s.themeOptionTitleActive]}>
                Branco Marfim
              </Text>
              <Text style={s.themeOptionSubtitle}>
                Pergaminho nobre e descanso visual
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Configurações da Palavra ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>CONFIGURAÇÕES DA PALAVRA</Text>

          <View style={s.groupedCard}>
            <TouchableOpacity
              onPress={handleSelectBibleVersion}
              style={s.rowItem}
              activeOpacity={0.7}
            >
              <View style={s.rowLabelWrap}>
                <Feather name="book" size={16} color={colors.text.secondary} />
                <Text style={s.rowLabel}>Versão da Bíblia</Text>
              </View>
              <View style={s.rowRightWrap}>
                <Text style={s.rowValue}>{versionLabels[bibleVersion]}</Text>
                <Feather name="chevron-right" size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>

            <View style={s.rowDivider} />

            <TouchableOpacity
              onPress={handleSelectFontSize}
              style={s.rowItem}
              activeOpacity={0.7}
            >
              <View style={s.rowLabelWrap}>
                <Feather name="type" size={16} color={colors.text.secondary} />
                <Text style={s.rowLabel}>Tamanho do Texto Sagrado</Text>
              </View>
              <View style={s.rowRightWrap}>
                <Text style={s.rowValue}>{fontSizeLabels[fontSize]}</Text>
                <Feather name="chevron-right" size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Lembretes de Fé & Notificações ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>LEMBRETES DE FÉ & NOTIFICAÇÕES</Text>

          <View style={s.groupedCard}>
            {/* Linha 1: Switch Lembrete Diário */}
            <View style={s.rowItem}>
              <View style={s.rowLabelWrap}>
                <Feather name="bell" size={16} color={notifSettings.enabled ? colors.amber.DEFAULT : colors.text.secondary} />
                <View style={s.rowTextCol}>
                  <Text style={s.rowLabel}>Lembrete Diário de Fé</Text>
                  <Text style={s.rowSublabel}>Recordar fidelidade e versículos conectados</Text>
                </View>
              </View>
              <View style={s.switchWrap}>
                <Switch
                  value={notifSettings.enabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: colors.bg.raised, true: colors.amber.DEFAULT }}
                  thumbColor={notifSettings.enabled ? colors.text.onAmber : colors.text.muted}
                />
              </View>
            </View>

            {notifSettings.enabled && (
              <>
                <View style={s.rowDivider} />

                {/* Linha 2: Horário da Recordação */}
                <TouchableOpacity
                  onPress={handleSelectNotificationTime}
                  style={s.rowItem}
                  activeOpacity={0.7}
                >
                  <View style={s.rowLabelWrap}>
                    <Feather name="clock" size={16} color={colors.text.secondary} />
                    <View style={s.rowTextCol}>
                      <Text style={s.rowLabel}>Horário da Recordação</Text>
                      <Text style={s.rowSublabel}>Momento de quietude e meditação diária</Text>
                    </View>
                  </View>
                  <View style={s.rowRightWrap}>
                    <Text style={s.rowValue}>{notifSettings.time}</Text>
                    <Feather name="chevron-right" size={16} color={colors.text.muted} />
                  </View>
                </TouchableOpacity>

                <View style={s.rowDivider} />

                {/* Linha 3: Testar Notificação Agora */}
                <TouchableOpacity
                  onPress={handleTestNotificationNow}
                  style={s.rowItem}
                  activeOpacity={0.7}
                  disabled={isTestingNotif}
                >
                  <View style={s.rowLabelWrap}>
                    <Feather name="send" size={16} color={colors.amber.DEFAULT} />
                    <View style={s.rowTextCol}>
                      <Text style={s.rowLabelHighlight}>Testar Notificação no Aparelho</Text>
                      <Text style={s.rowSublabel}>Disparar lembrete de demonstração em 2s</Text>
                    </View>
                  </View>
                  {isTestingNotif ? (
                    <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
                  ) : (
                    <Feather name="arrow-right" size={16} color={colors.amber.DEFAULT} />
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={s.rowDivider} />

            {/* Linha 4: Conexão com Bíblia Vive */}
            <View style={s.rowItem}>
              <View style={s.rowLabelWrap}>
                <Feather name="cloud" size={16} color={colors.text.secondary} />
                <View style={s.rowTextCol}>
                  <Text style={s.rowLabel}>Conexão Bíblia Vive</Text>
                  <Text style={s.rowSublabel}>
                    {notifSettings.pushTokenRegistered
                      ? 'Dispositivo conectado para receber reflexões e novidades'
                      : notifSettings.enabled
                      ? 'Lembretes diários ativos no aparelho'
                      : 'Ative os lembretes diários para conectar'}
                  </Text>
                </View>
              </View>
              <View style={[s.badgeActive, notifSettings.enabled && s.badgePushActive]}>
                <Text style={[s.badgeActiveText, notifSettings.enabled && s.badgePushActiveText]}>
                  {notifSettings.pushTokenRegistered ? 'CONECTADO' : notifSettings.enabled ? 'ATIVO' : 'DESLIGADO'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Cuidado Pastoral (Atalaia) ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>CUIDADO PASTORAL (ATALAIA)</Text>

          <View style={s.groupedCard}>
            <TouchableOpacity
              onPress={() => setAtalaiaModalVisible(true)}
              style={s.rowItem}
              activeOpacity={0.7}
            >
              <View style={s.rowLabelWrap}>
                <Feather
                  name="shield"
                  size={16}
                  color={
                    pastoralContact?.status === 'active'
                      ? '#7ECB98'
                      : pastoralContact?.status === 'pending'
                      ? colors.amber.DEFAULT
                      : colors.text.secondary
                  }
                />
                <View style={s.rowTextCol}>
                  <Text style={s.rowLabel}>
                    {pastoralContact?.status === 'active'
                      ? `Contato: ${pastoralContact.name}`
                      : pastoralContact?.status === 'pending'
                      ? `Aguardando: ${pastoralContact.name}`
                      : 'Configurar Contato de Cuidado'}
                  </Text>
                  <Text style={s.rowSublabel}>
                    {pastoralContact?.status === 'active'
                      ? `${pastoralContact.role} · Ele te chama de "${pastoralContact.requester_name}"`
                      : pastoralContact?.status === 'pending'
                      ? 'Convite enviado por e-mail (válido por 48h)'
                      : 'Pessoa de confiança para amparo e oração discreta'}
                  </Text>
                </View>
              </View>
              <View style={s.rowRightWrap}>
                {pastoralContact?.status === 'active' ? (
                  <View style={[s.badgeActive, { backgroundColor: isDark ? '#1B2E1E' : '#E8F5E9' }]}>
                    <Text style={[s.badgeActiveText, { color: '#7ECB98' }]}>
                      ATIVO
                    </Text>
                  </View>
                ) : pastoralContact?.status === 'pending' ? (
                  <View style={[s.badgeActive, s.badgePushActive]}>
                    <Text style={[s.badgeActiveText, s.badgePushActiveText]}>
                      PENDENTE
                    </Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sincronização em Nuvem ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>SINCRONIZAÇÃO EM NUVEM</Text>

          <View style={s.groupedCard}>
            <View style={s.rowItem}>
              <View style={s.rowLabelWrap}>
                <Feather
                  name={syncInfo.status === 'synced' ? 'cloud' : syncInfo.status === 'syncing' ? 'loader' : 'cloud-off'}
                  size={16}
                  color={syncInfo.status === 'synced' ? colors.amber.DEFAULT : colors.text.secondary}
                />
                <View>
                  <Text style={s.rowLabel}>Nuvem Bíblia Vive</Text>
                  <Text style={s.rowSublabel}>
                    {userEmail ? userEmail : 'Armazenamento deste dispositivo'}
                  </Text>
                </View>
              </View>
              <View style={s.cloudStatusPill}>
                <View
                  style={[
                    s.cloudDot,
                    syncInfo.status === 'synced'
                      ? { backgroundColor: '#7ECB98' }
                      : syncInfo.status === 'syncing'
                      ? { backgroundColor: colors.amber.DEFAULT }
                      : { backgroundColor: colors.text.muted },
                  ]}
                />
                <Text style={s.cloudStatusText}>
                  {syncInfo.status === 'syncing'
                    ? 'Sincronizando...'
                    : syncInfo.status === 'synced'
                    ? 'Conectado'
                    : 'Modo Local'}
                </Text>
              </View>
            </View>

            <View style={s.rowDivider} />

            <View style={s.syncStatsRow}>
              <View style={s.syncStatCol}>
                <Text style={s.syncStatVal}>{syncInfo.cloudCount}</Text>
                <Text style={s.syncStatLbl}>Na Nuvem</Text>
              </View>
              <View style={s.syncStatDivider} />
              <View style={s.syncStatCol}>
                <Text
                  style={[
                    s.syncStatVal,
                    syncInfo.pendingCount > 0 ? { color: colors.amber.DEFAULT } : null,
                  ]}
                >
                  {syncInfo.pendingCount}
                </Text>
                <Text style={s.syncStatLbl}>Pendentes</Text>
              </View>
              <View style={s.syncStatDivider} />
              <View style={s.syncStatCol}>
                <Text style={s.syncStatVal}>
                  {syncInfo.lastSyncTime ? relativeDate(syncInfo.lastSyncTime) : 'Nunca'}
                </Text>
                <Text style={s.syncStatLbl}>Último Envio</Text>
              </View>
            </View>

            <View style={s.rowDivider} />

            <TouchableOpacity
              onPress={handleTriggerSync}
              disabled={isSyncingManual}
              style={s.rowItem}
              activeOpacity={0.7}
            >
              <View style={s.rowLabelWrap}>
                <Feather
                  name={isSyncingManual ? 'loader' : 'refresh-cw'}
                  size={16}
                  color={colors.amber.DEFAULT}
                />
                <Text style={s.rowLabelHighlight}>
                  {isSyncingManual ? 'Sincronizando com a Nuvem...' : 'Sincronizar com a Nuvem Agora'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Preservação & Exportação ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>PRESERVAÇÃO DO MEMORIAL</Text>

          <View style={s.groupedCard}>
            <TouchableOpacity
              onPress={handleExportJournal}
              style={s.rowItem}
              activeOpacity={0.7}
            >
              <View style={s.rowLabelWrap}>
                <Feather name="download" size={16} color={colors.amber.DEFAULT} />
                <Text style={s.rowLabelHighlight}>Exportar Caderno de Memórias</Text>
              </View>
              <Feather name="share-2" size={16} color={colors.amber.DEFAULT} />
            </TouchableOpacity>

            <View style={s.rowDivider} />

            <TouchableOpacity
              onPress={handleSignOut}
              style={s.rowItem}
              activeOpacity={0.7}
            >
              <View style={s.rowLabelWrap}>
                <Feather name="log-out" size={16} color={colors.text.muted} />
                <Text style={s.rowLabelDanger}>Encerrar sessão</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Assinatura de Versão ── */}
        <View style={s.footerInfo}>
          <Text style={s.footerAppTitle}>MEMORIAL · APP DE MARCOS ESPIRITUAIS</Text>
          <Text style={s.footerVersion}>Versão 1.0.0 · Integrado ao Bíblia Vive</Text>
        </View>
      </ScrollView>

      {/* ── Modal de Seleção de Tradução Bíblica ── */}
      <ActionSheetModal
        visible={bibleVersionModalVisible}
        onClose={() => setBibleVersionModalVisible(false)}
        title="TRADUÇÃO BÍBLICA"
        subtitle="Escolha o texto canônico de sua preferência para leitura e conexões"
        items={bibleVersionItems}
      />

      {/* ── Modal de Escala Tipográfica ── */}
      <ActionSheetModal
        visible={fontSizeModalVisible}
        onClose={() => setFontSizeModalVisible(false)}
        title="ESCALA DO TEXTO"
        subtitle="Defina a densidade e o conforto visual para imersão nas Escrituras"
        items={fontSizeItems}
      />

      {/* ── Modal de Confirmação de Saída ── */}
      <ConfirmModal
        visible={signOutConfirmVisible}
        onClose={() => setSignOutConfirmVisible(false)}
        title="Encerrar Sessão"
        message="Deseja realmente sair da sua conta? Seus marcos salvos localmente permanecerão intactos neste aparelho."
        icon="log-out"
        confirmLabel="Encerrar Sessão"
        cancelLabel="Permanecer"
        destructive
        loading={isSigningOut}
        onConfirm={handleConfirmSignOut}
      />

      {/* ── Modal de Seleção de Horário de Notificação ── */}
      <ActionSheetModal
        visible={notifTimeSheetVisible}
        onClose={() => setNotifTimeSheetVisible(false)}
        title="HORÁRIO DO LEMBRETE"
        subtitle="Escolha o momento ideal para receber a recordação do seu marco de fé"
        items={notifTimeItems}
      />

      {/* ── Soft-Ask de Permissão de Notificação ── */}
      <ConfirmModal
        visible={notifSoftAskVisible}
        onClose={() => setNotifSoftAskVisible(false)}
        title="Recordações Diárias de Fé"
        message={"O Memorial não envia notificações promocionais ou ruídos. Nós apenas trazemos à sua memória os marcos de fé que você mesmo viveu e as promessas do Senhor para o seu dia.\n\nDeseja ativar os lembretes diários?"}
        confirmLabel="Ativar Lembretes"
        cancelLabel="Agora Não"
        icon="bell"
        onConfirm={handleConfirmEnableNotifications}
      />

      {/* ── Feedback de Sincronização em Nuvem ── */}
      <ConfirmModal
        visible={syncInfoModal.visible}
        onClose={() => setSyncInfoModal((prev) => ({ ...prev, visible: false }))}
        title={syncInfoModal.title}
        message={syncInfoModal.message}
        icon={syncInfoModal.icon || 'cloud'}
        confirmLabel="Entendido"
        cancelLabel=""
        destructive={syncInfoModal.destructive}
        onConfirm={() => setSyncInfoModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* ── Modal de Gerenciamento do Contato Pastoral (Atalaia) ── */}
      <AtalaiaContactModal
        visible={atalaiaModalVisible}
        onClose={() => setAtalaiaModalVisible(false)}
        currentContact={pastoralContact}
        onContactUpdated={loadUserData}
      />
    </View>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean) {
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing['5'],
      paddingTop: spacing['4'],
      gap: spacing['5'],
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      padding: spacing['4'],
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      gap: spacing['4'],
    },
    avatarWrap: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.bg.raised,
      borderWidth: 1.5,
      borderColor: colors.amber.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      color: colors.amber.DEFAULT,
      fontSize: 18,
      fontWeight: typography.weight.bold,
      letterSpacing: 1,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    profileMeta: {
      flex: 1,
      gap: 3,
    },
    profileName: {
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: typography.weight.bold,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    profileSubtitle: {
      color: colors.text.muted,
      fontSize: 12,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing['2'],
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.bg.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 4,
    },
    statBoxHighlight: {
      borderColor: colors.amber.DEFAULT,
      backgroundColor: colors.bg.raised,
    },
    statNumber: {
      color: colors.text.primary,
      fontSize: 22,
      fontWeight: typography.weight.bold,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    statNumberHighlight: {
      color: colors.amber.DEFAULT,
    },
    statLabel: {
      color: colors.text.muted,
      fontSize: 9,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.8,
      textAlign: 'center',
    },
    altarCard: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      padding: spacing['4'],
      gap: spacing['3'],
    },
    altarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['3'],
    },
    altarIconBox: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.bg.raised,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    altarTextWrap: {
      flex: 1,
      gap: 2,
    },
    altarTitle: {
      color: colors.text.primary,
      fontSize: 14,
      fontWeight: typography.weight.bold,
    },
    altarQuote: {
      color: colors.amber.DEFAULT,
      fontSize: 11,
      fontStyle: 'italic',
    },
    altarDescription: {
      color: colors.text.secondary,
      fontSize: 12,
      lineHeight: 18,
    },
    altarAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingTop: 4,
    },
    altarActionText: {
      color: colors.amber.DEFAULT,
      fontSize: 12,
      fontWeight: typography.weight.semibold,
    },
    sectionWrap: {
      gap: spacing['2'],
    },
    sectionHeader: {
      color: colors.text.muted,
      fontSize: 10,
      fontWeight: typography.weight.bold,
      letterSpacing: 1.5,
      paddingHorizontal: 4,
    },
    themeSelectorRow: {
      flexDirection: 'row',
      gap: spacing['3'],
    },
    themeOptionCard: {
      flex: 1,
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border.DEFAULT,
      padding: spacing['4'],
      gap: 6,
    },
    themeOptionCardActive: {
      borderColor: colors.amber.DEFAULT,
      backgroundColor: isDark ? colors.bg.raised : '#FFFFFF',
    },
    themeOptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    themeColorBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeColorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    activeBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.amber.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeOptionTitle: {
      color: colors.text.secondary,
      fontSize: 13,
      fontWeight: typography.weight.semibold,
    },
    themeOptionTitleActive: {
      color: colors.text.primary,
      fontWeight: typography.weight.bold,
    },
    themeOptionSubtitle: {
      color: colors.text.muted,
      fontSize: 11,
      lineHeight: 15,
    },
    groupedCard: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      overflow: 'hidden',
    },
    rowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing['4'],
      paddingVertical: 14,
    },
    rowLabelWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['3'],
      marginRight: spacing['3'],
    },
    rowTextCol: {
      flex: 1,
      justifyContent: 'center',
    },
    switchWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 4,
    },
    rowLabel: {
      color: colors.text.primary,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
    },
    rowLabelHighlight: {
      color: colors.amber.DEFAULT,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.semibold,
    },
    rowLabelDanger: {
      color: '#D47E7E',
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
    },
    rowRightWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: '55%',
    },
    rowValue: {
      color: colors.text.muted,
      fontSize: 12,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border.subtle,
      marginLeft: 44,
    },
    cloudStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.bg.raised,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    cloudDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#7ECB98',
    },
    cloudStatusText: {
      color: colors.text.secondary,
      fontSize: 11,
      fontWeight: typography.weight.medium,
    },
    rowSublabel: {
      color: colors.text.muted,
      fontSize: 11,
      marginTop: 2,
    },
    badgeActive: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: radius.xs,
      backgroundColor: colors.bg.raised,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeActiveText: {
      color: colors.text.muted,
      fontSize: 10,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.8,
    },
    badgePushActive: {
      backgroundColor: isDark ? 'rgba(217, 180, 99, 0.12)' : 'rgba(184, 126, 40, 0.10)',
      borderColor: colors.amber.DEFAULT,
    },
    badgePushActiveText: {
      color: colors.amber.DEFAULT,
    },
    syncStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing['3'],
      backgroundColor: colors.bg.surface,
    },
    syncStatCol: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    syncStatVal: {
      color: colors.text.primary,
      fontSize: 15,
      fontWeight: typography.weight.bold,
    },
    syncStatLbl: {
      color: colors.text.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    syncStatDivider: {
      width: StyleSheet.hairlineWidth,
      height: 24,
      backgroundColor: colors.border.subtle,
    },
    footerInfo: {
      alignItems: 'center',
      paddingVertical: spacing['6'],
      gap: 4,
    },
    footerAppTitle: {
      color: colors.text.muted,
      fontSize: 10,
      fontWeight: typography.weight.bold,
      letterSpacing: 1.5,
    },
    footerVersion: {
      color: colors.text.muted,
      fontSize: 11,
    },
  });
}

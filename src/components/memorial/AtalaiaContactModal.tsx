import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';
import { InputField, ConfirmModal } from '../ui';
import {
  PastoralContact,
  PastoralAlert,
  formatAlertHistoryItem,
} from '../../lib/atalaiaTypes';
import {
  sendPastoralInvitation,
  resendPastoralInvitation,
  revokePastoralContact,
  sendExplicitHelpRequest,
  fetchPastoralAlertHistory,
} from '../../lib/atalaiaStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentContact: PastoralContact | null;
  onContactUpdated: () => void;
}

export function AtalaiaContactModal({
  visible,
  onClose,
  currentContact,
  onContactUpdated,
}: Props) {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Pastor');
  const [requesterName, setRequesterName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [revokeConfirmVisible, setRevokeConfirmVisible] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Estados de Pedido Explícito de Ajuda e Histórico de Sinais (Ticket 5)
  const [explicitHelpConfirmVisible, setExplicitHelpConfirmVisible] = useState(false);
  const [isSendingExplicit, setIsSendingExplicit] = useState(false);
  const [rateLimitAlertVisible, setRateLimitAlertVisible] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');

  const [alertHistory, setAlertHistory] = useState<PastoralAlert[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const list = await fetchPastoralAlertHistory();
      setAlertHistory(list);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setErrorMessage('');
      setIsReplacing(false);
      loadHistory();
      if (currentContact) {
        setName(currentContact.name);
        setEmail(currentContact.email);
        setRole(currentContact.role);
        setRequesterName(currentContact.requester_name);
      } else {
        setName('');
        setEmail('');
        setRole('Pastor');
        setRequesterName('');
      }
    }
  }, [visible, currentContact]);

  const handleSendExplicitHelp = async () => {
    setIsSendingExplicit(true);
    try {
      const res = await sendExplicitHelpRequest();
      setExplicitHelpConfirmVisible(false);
      if (res.rateLimited) {
        setRateLimitMessage(
          res.message ||
            'Você já enviou um pedido de ajuda hoje. Seu contato foi notificado e pode entrar em contato a qualquer momento.'
        );
        setRateLimitAlertVisible(true);
      } else if (res.success) {
        Alert.alert(
          'Pedido Enviado',
          `Avisamos ${currentContact?.name || 'seu contato'} que você gostaria de conversar. Ele foi orientado a entrar em contato com brevidade.`
        );
        loadHistory();
      } else {
        Alert.alert('Erro', res.message || 'Falha ao enviar pedido de conversa.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Erro inesperado ao solicitar conversa.');
    } finally {
      setIsSendingExplicit(false);
    }
  };

  const handleSendInvite = async () => {
    setErrorMessage('');
    if (!name.trim()) {
      setErrorMessage('Informe o nome do contato pastoral.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Informe um e-mail válido para o contato.');
      return;
    }
    if (!requesterName.trim()) {
      setErrorMessage('Informe "Como seu contato deve te chamar" para que ele te reconheça.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPastoralInvitation({
        name,
        email,
        role,
        requesterName,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Não foi possível enviar o convite.');
      } else {
        Alert.alert(
          'Convite Enviado',
          `Um convite discreto foi enviado para ${email}. O link é válido por 48 horas.`
        );
        setIsReplacing(false);
        onContactUpdated();
        onClose();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Erro inesperado ao enviar convite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!currentContact) return;
    setIsSubmitting(true);
    try {
      const res = await resendPastoralInvitation(currentContact);
      if (res.success) {
        Alert.alert(
          'Convite Reenviado',
          `Novo e-mail com link válido por 48 horas foi enviado para ${currentContact.email}.`
        );
        onContactUpdated();
      } else {
        Alert.alert('Erro', res.error || 'Falha ao reenviar convite.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Erro inesperado ao reenviar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!currentContact) return;
    setIsRevoking(true);
    try {
      const res = await revokePastoralContact(currentContact.id);
      if (res.success) {
        setRevokeConfirmVisible(false);
        onContactUpdated();
        onClose();
      } else {
        Alert.alert('Erro', res.error || 'Falha ao revogar contato.');
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const hasExisting = Boolean(currentContact && !isReplacing);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.container}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.headerIconBox}>
              <Feather name="shield" size={18} color={colors.amber.DEFAULT} />
            </View>
            <View>
              <Text style={s.headerTitle}>Contato de Cuidado Pastoral</Text>
              <Text style={s.headerSubtitle}>Atalaia · Bíblia Vive</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card de Governança Editorial */}
          <View style={s.governanceCard}>
            <Text style={s.governanceTitle}>"O Memorial guarda. O Atalaia cuida."</Text>
            <Text style={s.governanceBody}>
              Seu contato <Text style={s.boldText}>nunca terá acesso</Text> às suas anotações,
              orações íntimas ou memórias escritas diante de Deus. O papel dele é ser um porto
              seguro de intercessão e afeto caso você consinta em sinalizar uma aproximação.
            </Text>
          </View>

          {/* Estado: Contato Existente (Ativo ou Pendente) */}
          {hasExisting && currentContact && (
            <View style={s.statusSection}>
              <View style={s.statusCard}>
                <View style={s.statusBadgeRow}>
                  <View
                    style={[
                      s.statusDot,
                      {
                        backgroundColor:
                          currentContact.status === 'active'
                            ? '#7ECB98'
                            : colors.amber.DEFAULT,
                      },
                    ]}
                  />
                  <Text style={s.statusBadgeText}>
                    {currentContact.status === 'active'
                      ? 'CONTATO ATIVO DE CUIDADO'
                      : 'AGUARDANDO CONFIRMAÇÃO (PENDENTE)'}
                  </Text>
                </View>

                <Text style={s.contactNameText}>{currentContact.name}</Text>
                <Text style={s.contactMetaText}>
                  {currentContact.email} · {currentContact.role}
                </Text>

                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>Como ele te chama:</Text>
                  <Text style={s.infoValue}>"{currentContact.requester_name}"</Text>
                </View>

                {currentContact.status === 'pending' && (
                  <View style={s.pendingNoticeBox}>
                    <Feather name="clock" size={14} color={colors.amber.DEFAULT} />
                    <Text style={s.pendingNoticeText}>
                      Um convite foi enviado por e-mail com link válido por 48 horas.
                    </Text>
                  </View>
                )}
              </View>

              {/* Pedido Direto: Preciso conversar com alguém (Ticket 5) */}
              {currentContact.status === 'active' && (
                <View style={s.explicitCard}>
                  <View style={s.explicitCardHeader}>
                    <View style={s.explicitIconBox}>
                      <Feather name="message-circle" size={18} color={colors.amber.DEFAULT} />
                    </View>
                    <View style={s.explicitTextWrap}>
                      <Text style={s.explicitTitle}>Preciso conversar com alguém</Text>
                      <Text style={s.explicitSubtitle}>
                        Solicitar contato fraterno prioritário com {currentContact.name}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setExplicitHelpConfirmVisible(true)}
                    disabled={isSendingExplicit}
                    style={s.explicitBtn}
                    activeOpacity={0.8}
                  >
                    {isSendingExplicit ? (
                      <ActivityIndicator size="small" color={colors.text.onAmber} />
                    ) : (
                      <>
                        <Feather name="send" size={15} color={colors.text.onAmber} />
                        <Text style={s.explicitBtnText}>Solicitar Conversa Agora</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Ações para Contato Existente */}
              <View style={s.actionsGroup}>
                {currentContact.status === 'pending' && (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={isSubmitting}
                    style={s.primaryActionBtn}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={colors.text.onAmber} />
                    ) : (
                      <>
                        <Feather name="mail" size={16} color={colors.text.onAmber} />
                        <Text style={s.primaryActionText}>Reenviar Convite por E-mail</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setIsReplacing(true)}
                  style={s.secondaryActionBtn}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={15} color={colors.text.primary} />
                  <Text style={s.secondaryActionText}>Substituir Contato</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRevokeConfirmVisible(true)}
                  style={s.dangerActionBtn}
                  activeOpacity={0.8}
                >
                  <Feather name="user-x" size={15} color={colors.error} />
                  <Text style={s.dangerActionText}>Revogar Autorização</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Formulário: Novo Contato ou Substituição */}
          {(!hasExisting || isReplacing) && (
            <View style={s.formSection}>
              {isReplacing && (
                <View style={s.replaceHeaderRow}>
                  <Text style={s.formSectionTitle}>Substituir Contato Atual</Text>
                  <TouchableOpacity onPress={() => setIsReplacing(false)}>
                    <Text style={s.cancelReplaceText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {errorMessage ? (
                <View style={s.errorBox}>
                  <Feather name="alert-circle" size={14} color={colors.error} />
                  <Text style={s.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <InputField
                label="Nome do Contato"
                placeholder="Ex: Pastor Marcos, Líder Lucas"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <InputField
                label="E-mail do Contato"
                placeholder="pastor@igreja.org"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <InputField
                label="Papel / Ministério"
                placeholder="Ex: Pastor, Líder de Célula, Discipulador"
                value={role}
                onChangeText={setRole}
              />

              <InputField
                label="Como seu contato deve te chamar *"
                placeholder="Ex: Bruno, Bruninho, Irmão Bruno"
                value={requesterName}
                onChangeText={setRequesterName}
                autoCapitalize="words"
              />
              <Text style={s.fieldHint}>
                * Obrigatório. Este é o nome que aparecerá no convite e na mensagem de cuidado para
                que ele saiba imediatamente quem você é.
              </Text>

              <TouchableOpacity
                onPress={handleSendInvite}
                disabled={isSubmitting}
                style={s.submitBtn}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.text.onAmber} />
                ) : (
                  <>
                    <Feather name="send" size={16} color={colors.text.onAmber} />
                    <Text style={s.submitBtnText}>Enviar Convite Pastoral</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Histórico Técnico de Sinais (Ticket 5) */}
          <View style={s.historySection}>
            <View style={s.historyHeaderRow}>
              <View style={s.historyHeaderLeft}>
                <Feather name="clock" size={16} color={colors.amber.DEFAULT} />
                <Text style={s.historySectionTitle}>Histórico de Sinais</Text>
              </View>
              <TouchableOpacity
                onPress={loadHistory}
                disabled={isLoadingHistory}
                activeOpacity={0.7}
                style={s.historyReloadBtn}
              >
                {isLoadingHistory ? (
                  <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
                ) : (
                  <Feather name="refresh-cw" size={14} color={colors.text.muted} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={s.historySectionSubtitle}>
              Registro de transparência técnica dos avisos enviados em seu nome. Visível apenas para você.
            </Text>

            {isLoadingHistory && alertHistory.length === 0 ? (
              <View style={s.historyLoadingBox}>
                <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
              </View>
            ) : alertHistory.length === 0 ? (
              <View style={s.emptyHistoryCard}>
                <Feather name="shield" size={18} color={colors.text.muted} />
                <Text style={s.emptyHistoryText}>
                  Nenhum sinal ou pedido de conversa foi enviado até o momento.
                </Text>
              </View>
            ) : (
              <View style={s.historyList}>
                {alertHistory.map((item) => {
                  const formatted = formatAlertHistoryItem(item);
                  const isDelivered = formatted.deliveryStatus === 'delivered';
                  const isFailed = formatted.deliveryStatus === 'failed';
                  const statusColor = isDelivered
                    ? '#7ECB98'
                    : isFailed
                    ? colors.error
                    : colors.amber.DEFAULT;
                  const isExplicit = formatted.triggerType === 'explicit_help';

                  return (
                    <View key={item.id} style={s.historyItemCard}>
                      <View style={s.historyItemHeader}>
                        <View style={s.historyItemTypeWrap}>
                          <Feather
                            name={isExplicit ? 'message-circle' : 'send'}
                            size={14}
                            color={isExplicit ? colors.amber.DEFAULT : colors.text.secondary}
                          />
                          <Text style={s.historyItemTypeTitle}>{formatted.typeLabel}</Text>
                        </View>
                        <View style={[s.historyStatusBadge, { borderColor: statusColor }]}>
                          <View
                            style={[s.historyStatusDot, { backgroundColor: statusColor }]}
                          />
                          <Text style={[s.historyStatusLabel, { color: statusColor }]}>
                            {formatted.statusLabel}
                          </Text>
                        </View>
                      </View>

                      <View style={s.historyItemFooter}>
                        <Text style={s.historyItemDateText}>{formatted.formattedDate}</Text>
                        <View style={s.historyPrivacyWrap}>
                          <Feather name="lock" size={11} color={colors.text.muted} />
                          <Text style={s.historyPrivacyText}>Memórias 100% privadas</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmação de Revogação */}
      <ConfirmModal
        visible={revokeConfirmVisible}
        onClose={() => setRevokeConfirmVisible(false)}
        title="Revogar Contato de Cuidado?"
        message="Seu contato pastoral não poderá mais ser notificado e nenhum sinal poderá ser enviado até que um novo contato seja ativado."
        confirmLabel="Revogar Agora"
        cancelLabel="Voltar"
        destructive={true}
        loading={isRevoking}
        onConfirm={handleConfirmRevoke}
      />

      {/* Confirmação de Pedido Explícito de Conversa (Ticket 5) */}
      <ConfirmModal
        visible={explicitHelpConfirmVisible}
        onClose={() => setExplicitHelpConfirmVisible(false)}
        title={`Pedir Conversa com ${currentContact?.name || 'Contato'}?`}
        message={`Seu contato pastoral receberá uma notificação prioritária avisando que você gostaria de conversar ou receber uma ligação.\n\nNenhuma palavra de suas memórias ou orações será enviada.`}
        confirmLabel="Pedir Conversa"
        cancelLabel="Cancelar"
        destructive={false}
        loading={isSendingExplicit}
        onConfirm={handleSendExplicitHelp}
      />

      {/* Modal de Trava de 24h com Atalho para CVV 188 (Ticket 5) */}
      <Modal
        visible={rateLimitAlertVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRateLimitAlertVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.rateLimitBox}>
            <View style={s.rateLimitIconBox}>
              <Feather name="clock" size={24} color={colors.amber.DEFAULT} />
            </View>
            <Text style={s.rateLimitTitle}>Pedido Já Enviado Hoje</Text>
            <Text style={s.rateLimitMessage}>{rateLimitMessage}</Text>
            <Text style={s.rateLimitSubmessage}>
              Se você estiver em um momento de aflição e precisar de apoio imediato, o CVV
              (Centro de Valorização da Vida) oferece acolhimento gratuito 24h pelo telefone 188.
            </Text>
            <View style={s.rateLimitActions}>
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL('tel:188').catch(() => {});
                  setRateLimitAlertVisible(false);
                }}
                style={s.rateLimitCvvBtn}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={15} color={colors.text.primary} />
                <Text style={s.rateLimitCvvBtnText}>Ligar CVV 188</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRateLimitAlertVisible(false)}
                style={s.rateLimitOkBtn}
                activeOpacity={0.8}
              >
                <Text style={s.rateLimitOkBtnText}>Entendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing['4'],
      paddingVertical: spacing['3'],
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['2'],
    },
    headerIconBox: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: isDark ? '#2B261D' : '#F7EBDC',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.text.muted,
    },
    closeBtn: {
      padding: spacing['1'],
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing['4'],
      gap: spacing['4'],
    },
    governanceCard: {
      backgroundColor: isDark ? '#1C1A22' : '#F9F7F1',
      borderLeftWidth: 3,
      borderLeftColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      padding: spacing['3'],
    },
    governanceTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.amber.DEFAULT,
      marginBottom: 6,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    governanceBody: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text.secondary,
    },
    boldText: {
      fontWeight: '700',
      color: colors.text.primary,
    },
    statusSection: {
      gap: spacing['3'],
    },
    statusCard: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      padding: spacing['4'],
      gap: spacing['2'],
    },
    statusBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      color: colors.text.secondary,
    },
    contactNameText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    contactMetaText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.text.muted,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.amber.DEFAULT,
    },
    pendingNoticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? '#26221A' : '#FFF8EE',
      borderRadius: radius.sm,
      padding: spacing['2'],
      marginTop: 6,
    },
    pendingNoticeText: {
      fontSize: 12,
      color: colors.amber.DEFAULT,
      flex: 1,
    },
    actionsGroup: {
      gap: spacing['2'],
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      paddingVertical: 14,
    },
    primaryActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onAmber,
    },
    secondaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.bg.raised,
      borderRadius: radius.md,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    secondaryActionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    dangerActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: radius.md,
      paddingVertical: 10,
    },
    dangerActionText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.error,
    },
    formSection: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      padding: spacing['4'],
      gap: spacing['2'],
    },
    replaceHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing['1'],
    },
    formSectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    cancelReplaceText: {
      fontSize: 13,
      color: colors.amber.DEFAULT,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#3E1C1F',
      borderRadius: radius.sm,
      padding: spacing['2'],
      marginBottom: spacing['1'],
    },
    errorText: {
      fontSize: 12,
      color: '#FFB4AB',
      flex: 1,
    },
    fieldHint: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: -4,
      marginBottom: 6,
      lineHeight: 15,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      paddingVertical: 14,
      marginTop: spacing['3'],
    },
    submitBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.onAmber,
    },
    // Estilos do Pedido Explícito de Ajuda (Ticket 5)
    explicitCard: {
      backgroundColor: isDark ? '#261F18' : '#FFF9F0',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: isDark ? '#4A3B2C' : '#F2DEB9',
      padding: spacing['4'],
      gap: spacing['3'],
    },
    explicitCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['3'],
    },
    explicitIconBox: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: isDark ? '#3D2F1F' : '#FCEAD2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    explicitTextWrap: {
      flex: 1,
    },
    explicitTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    explicitSubtitle: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    explicitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      paddingVertical: 12,
    },
    explicitBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onAmber,
    },
    // Estilos do Histórico Técnico de Sinais (Ticket 5)
    historySection: {
      marginTop: spacing['2'],
      paddingTop: spacing['4'],
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      gap: spacing['2'],
    },
    historyHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    historyHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['2'],
    },
    historySectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    historyReloadBtn: {
      padding: spacing['1'],
    },
    historySectionSubtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.text.muted,
      marginBottom: spacing['2'],
    },
    historyLoadingBox: {
      paddingVertical: spacing['4'],
      alignItems: 'center',
    },
    emptyHistoryCard: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      padding: spacing['4'],
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing['2'],
    },
    emptyHistoryText: {
      fontSize: 13,
      color: colors.text.muted,
      textAlign: 'center',
    },
    historyList: {
      gap: spacing['2'],
    },
    historyItemCard: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      padding: spacing['3'],
      gap: spacing['2'],
    },
    historyItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    historyItemTypeWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    historyItemTypeTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },
    historyStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    historyStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    historyStatusLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    historyItemFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    historyItemDateText: {
      fontSize: 12,
      color: colors.text.muted,
    },
    historyPrivacyWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    historyPrivacyText: {
      fontSize: 11,
      color: colors.text.muted,
    },
    // Estilos do Modal de Cooldown / CVV 188 (Ticket 5)
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing['4'],
    },
    rateLimitBox: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      padding: spacing['5'],
      gap: spacing['3'],
      alignItems: 'center',
    },
    rateLimitIconBox: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: isDark ? '#2B261D' : '#F7EBDC',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rateLimitTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text.primary,
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    rateLimitMessage: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    rateLimitSubmessage: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.amber.DEFAULT,
      textAlign: 'center',
      backgroundColor: isDark ? '#231F19' : '#FFF9F0',
      borderRadius: radius.sm,
      padding: spacing['3'],
    },
    rateLimitActions: {
      width: '100%',
      gap: spacing['2'],
      marginTop: spacing['2'],
    },
    rateLimitCvvBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.bg.raised,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      paddingVertical: 12,
    },
    rateLimitCvvBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    rateLimitOkBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    rateLimitOkBtnText: {
      fontSize: 14,
      color: colors.text.muted,
    },
  });
}

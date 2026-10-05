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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';
import { InputField, ConfirmModal } from '../ui';
import { PastoralContact } from '../../lib/atalaiaTypes';
import {
  sendPastoralInvitation,
  resendPastoralInvitation,
  revokePastoralContact,
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

  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    if (visible) {
      setErrorMessage('');
      setIsReplacing(false);
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
  });
}

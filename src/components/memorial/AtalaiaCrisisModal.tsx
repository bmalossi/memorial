// ─────────────────────────────────────────────────────────────────────────────
// AtalaiaCrisisModal.tsx — Bíblia Vive & Memorial
//
// Modal/Popup Solene de Intervenção de Cuidado Pastoral e Apoio à Vida.
// Acionado quando uma reflexão ou marco expressa depressão, dor profunda,
// desespero ou perda da vontade de viver.
// Prioridade máxima: Acolhimento, canal CVV 188 e acionamento pastoral.
// Padrão editorial nobre, sem julgamentos, caloroso e livre de AI-slop.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';

export interface AtalaiaCrisisModalProps {
  visible: boolean;
  onClose: () => void;
  pastorName?: string;
  hasActivePastor?: boolean;
  onConfigurePastor?: () => void;
  onSendPastoralAlert?: () => Promise<void> | void;
}

export function AtalaiaCrisisModal({
  visible,
  onClose,
  pastorName,
  hasActivePastor = false,
  onConfigurePastor,
  onSendPastoralAlert,
}: AtalaiaCrisisModalProps) {
  const { colors, isDark } = useTheme();
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const handleCallCVV = () => {
    Linking.openURL('tel:188').catch((err) => {
      console.warn('Erro ao discar para o CVV 188:', err);
    });
  };

  const handleSendPastorSignal = async () => {
    if (!onSendPastoralAlert) return;
    setIsSendingAlert(true);
    try {
      await onSendPastoralAlert();
      setAlertSent(true);
    } finally {
      setIsSendingAlert(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        {/* Backdrop escuro com toque de fechamento suave */}
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Card Solene Centralizado */}
        <View
          style={[
            s.dialogBox,
            {
              backgroundColor: isDark ? '#18171D' : '#FFFFFF',
              borderColor: isDark ? '#3D3428' : '#E8D8C3',
            },
          ]}
        >
          {/* Emblema Acolhedor */}
          <View
            style={[
              s.emblemWrap,
              {
                backgroundColor: isDark ? 'rgba(231, 176, 117, 0.12)' : 'rgba(184, 126, 40, 0.12)',
                borderColor: isDark ? 'rgba(231, 176, 117, 0.28)' : 'rgba(184, 126, 40, 0.28)',
              },
            ]}
          >
            <Feather name="heart" size={24} color={colors.amber.DEFAULT} />
          </View>

          {/* Kicker Editorial */}
          <Text style={[s.kicker, { color: colors.amber.DEFAULT }]}>
            ATALAIA · ACOLHIMENTO E APOIO À VIDA
          </Text>

          {/* Título Serif */}
          <Text style={[s.title, { color: colors.text.primary }]}>
            Você não precisa caminhar só
          </Text>

          {/* Divisor minimalista */}
          <View
            style={[
              s.divider,
              { backgroundColor: isDark ? 'rgba(231, 176, 117, 0.25)' : 'rgba(184, 126, 40, 0.25)' },
            ]}
          />

          {/* Mensagem Fraterna e Compassiva */}
          <Text style={[s.bodyText, { color: colors.text.secondary }]}>
            Percebemos em seu registro um momento de profunda aflição ou cansaço interior. Diante de
            Deus, a sua vida tem um valor imensurável e suas dores não passam despercebidas.
          </Text>
          <Text style={[s.bodySubtext, { color: colors.text.muted }]}>
            Por favor, não carregue este peso em silêncio. Há apoio humano, escuta fraterna e
            esperança disponíveis para você agora.
          </Text>

          {/* ── BOTÃO 1: Ligar para o CVV 188 (Prioridade Máxima) ── */}
          <TouchableOpacity
            style={[
              s.cvvButton,
              {
                backgroundColor: isDark ? '#2D161A' : '#FDE8E8',
                borderColor: isDark ? '#6E2C33' : '#F8B4B4',
              },
            ]}
            onPress={handleCallCVV}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ligar gratuitamente para o CVV 188"
          >
            <View style={[s.cvvIconCircle, { backgroundColor: isDark ? '#4D1B22' : '#FCA5A5' }]}>
              <Feather name="phone-call" size={18} color={isDark ? '#FCA5A5' : '#991B1B'} />
            </View>
            <View style={s.btnTextWrap}>
              <Text style={[s.cvvTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                Ligar para o Apoio CVV (188)
              </Text>
              <Text style={[s.cvvSubtitle, { color: isDark ? '#D1A3A8' : '#7F1D1D' }]}>
                Ligação gratuita · Sigilosa · Atendimento 24 horas
              </Text>
            </View>
            <Feather name="arrow-up-right" size={16} color={isDark ? '#FCA5A5' : '#991B1B'} />
          </TouchableOpacity>

          {/* ── BOTÃO 2: Apoio Pastoral (Condicional) ── */}
          {hasActivePastor ? (
            <TouchableOpacity
              style={[
                s.pastoralButton,
                {
                  backgroundColor: isDark ? '#211F28' : '#F7F5F0',
                  borderColor: isDark ? '#3A3644' : '#E5E0D8',
                },
              ]}
              onPress={handleSendPastorSignal}
              disabled={isSendingAlert || alertSent}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <View
                style={[
                  s.pastoralIconCircle,
                  { backgroundColor: isDark ? 'rgba(231, 176, 117, 0.15)' : 'rgba(184, 126, 40, 0.15)' },
                ]}
              >
                {isSendingAlert ? (
                  <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
                ) : (
                  <Feather
                    name={alertSent ? 'check' : 'shield'}
                    size={17}
                    color={colors.amber.DEFAULT}
                  />
                )}
              </View>
              <View style={s.btnTextWrap}>
                <Text style={[s.pastoralTitle, { color: colors.text.primary }]}>
                  {alertSent
                    ? 'Sinal de Cuidado Enviado!'
                    : `Avisar o Pr. ${pastorName || 'seu pastor'}`}
                </Text>
                <Text style={[s.pastoralSubtitle, { color: colors.text.muted }]}>
                  {alertSent
                    ? 'Seu pastor foi avisado para orar e estender a mão.'
                    : 'Envia um sinal discreto de oração, sem expor seu texto íntimo.'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            onConfigurePastor && (
              <TouchableOpacity
                style={[
                  s.pastoralButton,
                  {
                    backgroundColor: isDark ? '#211F28' : '#F7F5F0',
                    borderColor: isDark ? '#3A3644' : '#E5E0D8',
                  },
                ]}
                onPress={() => {
                  onClose();
                  onConfigurePastor();
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <View
                  style={[
                    s.pastoralIconCircle,
                    { backgroundColor: isDark ? 'rgba(231, 176, 117, 0.15)' : 'rgba(184, 126, 40, 0.15)' },
                  ]}
                >
                  <Feather name="user-plus" size={17} color={colors.amber.DEFAULT} />
                </View>
                <View style={s.btnTextWrap}>
                  <Text style={[s.pastoralTitle, { color: colors.text.primary }]}>
                    Conectar um Pastor ou Amigo de Fé
                  </Text>
                  <Text style={[s.pastoralSubtitle, { color: colors.text.muted }]}>
                    Cadastre alguém de confiança para caminhar junto em oração.
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )}

          {/* Citação Bíblica Solene */}
          <View style={s.verseBox}>
            <Text style={[s.verseText, { color: colors.text.muted }]}>
              “Perto está o Senhor dos que têm o coração quebrantado, e salva os de espírito
              oprimido.”
            </Text>
            <Text style={[s.verseRef, { color: colors.amber.DEFAULT }]}>Salmos 34:18</Text>
          </View>

          {/* Botão de Fechamento Suave */}
          <TouchableOpacity
            style={s.dismissBtn}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[s.dismissBtnText, { color: colors.text.secondary }]}>
              Continuar no aplicativo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(8, 7, 10, 0.88)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  emblemWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  divider: {
    width: 36,
    height: 1,
    marginBottom: 14,
  },
  bodyText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  bodySubtext: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  cvvButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 12,
  },
  cvvIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastoralButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 12,
  },
  pastoralIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWrap: {
    flex: 1,
  },
  cvvTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  cvvSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  pastoralTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  pastoralSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  verseBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    marginBottom: 14,
    alignItems: 'center',
    width: '100%',
  },
  verseText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  verseRef: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
  },
  dismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissBtnText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
});

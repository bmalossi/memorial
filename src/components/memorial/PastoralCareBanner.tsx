import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';

export interface PastoralCareBannerProps {
  mode: 'acolhimento' | 'sugestao_sinal';
  pastorName?: string;
  onDismiss: () => void;
  onConfigureContact?: () => void;
  onRequestSignal?: () => void;
  onExplicitHelp?: () => void;
  containerStyle?: ViewStyle;
}

export function PastoralCareBanner({
  mode,
  pastorName,
  onDismiss,
  onConfigureContact,
  onRequestSignal,
  onExplicitHelp,
  containerStyle,
}: PastoralCareBannerProps) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const handleCallCVV = () => {
    Linking.openURL('tel:188').catch((err) => {
      console.warn('Erro ao discar para o CVV 188:', err);
    });
  };

  if (mode === 'acolhimento') {
    return (
      <View style={[s.container, containerStyle]}>
        {/* Header com Ícone e Título Sereno */}
        <View style={s.headerRow}>
          <View style={s.iconBox}>
            <Feather name="heart" size={16} color={colors.amber.DEFAULT} />
          </View>
          <View style={s.titleWrap}>
            <Text style={s.title}>Você não precisa caminhar só</Text>
            <Text style={s.subtitle}>Acolhimento Bíblia Vive · Atalaia</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={s.dismissBtn} activeOpacity={0.7}>
            <Feather name="x" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Mensagem Acolhedora Sem Rótulos Clínicos */}
        <Text style={s.bodyText}>
          Percebemos que este momento tem sido de aflição ou cansaço interior. Diante de Deus,
          suas orações são guardadas em segredo. Se desejar apoio humano fraterno, você pode
          adicionar uma pessoa de confiança para orar por você ou recorrer a canais gratuitos de
          escuta e vida.
        </Text>

        {/* Botões de Ação */}
        <View style={s.actionsCol}>
          <View style={s.primaryActionsRow}>
            {onConfigureContact && (
              <TouchableOpacity
                onPress={onConfigureContact}
                style={s.actionBtnGold}
                activeOpacity={0.8}
              >
                <Feather name="shield" size={14} color={colors.text.onAmber} />
                <Text style={s.actionBtnGoldText}>Configurar Contato de Oração</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleCallCVV}
              style={s.actionBtnCvv}
              activeOpacity={0.8}
            >
              <Feather name="phone" size={14} color={colors.text.primary} />
              <Text style={s.actionBtnCvvText}>Apoio CVV (Ligue 188)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onDismiss} style={s.dismissTextBtn} activeOpacity={0.7}>
            <Text style={s.dismissText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Modo: Sugestão de Sinal de Cuidado (Leitor possui pastor cadastrado)
  return (
    <View style={[s.container, containerStyle]}>
      <View style={s.headerRow}>
        <View style={s.iconBox}>
          <Feather name="shield" size={16} color={colors.amber.DEFAULT} />
        </View>
        <View style={s.titleWrap}>
          <Text style={s.title}>Deseja ser lembrado em oração?</Text>
          <Text style={s.subtitle}>Ponte de Cuidado Pastoral</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={s.dismissBtn} activeOpacity={0.7}>
          <Feather name="x" size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <Text style={s.bodyText}>
        Seus registros permanecem estritamente secretos e confidenciais entre você e Deus.
        Gostaria de avisar discretamente{' '}
        <Text style={s.boldText}>{pastorName || 'seu contato pastoral'}</Text> para que ele puxe
        conversa com você com carinho? Nenhuma palavra do que você escreveu será enviada.
      </Text>

      <View style={s.actionsCol}>
        <View style={s.primaryActionsRow}>
          {onRequestSignal && (
            <TouchableOpacity
              onPress={onRequestSignal}
              style={s.actionBtnGold}
              activeOpacity={0.8}
            >
              <Feather name="send" size={14} color={colors.text.onAmber} />
              <Text style={s.actionBtnGoldText}>Enviar Sinal de Cuidado</Text>
            </TouchableOpacity>
          )}

          {onExplicitHelp && (
            <TouchableOpacity
              onPress={onExplicitHelp}
              style={s.actionBtnSecondary}
              activeOpacity={0.8}
            >
              <Feather name="message-circle" size={14} color={colors.text.primary} />
              <Text style={s.actionBtnSecondaryText}>Preciso conversar com alguém</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleCallCVV}
            style={s.actionBtnCvv}
            activeOpacity={0.8}
          >
            <Feather name="phone" size={14} color={colors.text.primary} />
            <Text style={s.actionBtnCvvText}>CVV 188</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onDismiss} style={s.dismissTextBtn} activeOpacity={0.7}>
          <Text style={s.dismissText}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(231,176,117,0.22)' : 'rgba(180,130,70,0.18)',
      padding: spacing['4'],
      gap: spacing['3'],
      marginVertical: spacing['2'],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      backgroundColor: isDark ? '#2B261D' : '#F7EBDC',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: {
      flex: 1,
      marginLeft: spacing['2'],
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    subtitle: {
      fontSize: 11,
      color: colors.text.muted,
      marginTop: 1,
    },
    dismissBtn: {
      padding: spacing['1'],
    },
    bodyText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text.secondary,
    },
    boldText: {
      fontWeight: '600',
      color: colors.text.primary,
    },
    actionsCol: {
      gap: spacing['2'],
      marginTop: spacing['1'],
    },
    primaryActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['2'],
      flexWrap: 'wrap',
    },
    actionBtnGold: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      paddingHorizontal: spacing['3'],
      paddingVertical: 10,
    },
    actionBtnGoldText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.onAmber,
    },
    actionBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.bg.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      paddingHorizontal: spacing['3'],
      paddingVertical: 10,
    },
    actionBtnSecondaryText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.primary,
    },
    actionBtnCvv: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.bg.raised,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      paddingHorizontal: spacing['3'],
      paddingVertical: 10,
    },
    actionBtnCvvText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.primary,
    },
    dismissTextBtn: {
      alignSelf: 'center',
      paddingVertical: 4,
    },
    dismissText: {
      fontSize: 12,
      color: colors.text.muted,
    },
  });
}

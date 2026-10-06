import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';
import { PastoralIntent } from '../../lib/types';
import { getPastoralPillCopy } from '../../lib/classifierJEV';

export interface PastoralCareActionBannerProps {
  intent: PastoralIntent;
  confidence: number;
  pastorName: string;
  biblicalReference?: string;
  onSend: (intent: PastoralIntent) => Promise<void> | void;
  onDismiss: () => void;
  containerStyle?: ViewStyle;
  isSending?: boolean;
}

export function PastoralCareActionBanner({
  intent,
  confidence,
  pastorName,
  biblicalReference,
  onSend,
  onDismiss,
  containerStyle,
  isSending = false,
}: PastoralCareActionBannerProps) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark, intent), [colors, isDark, intent]);

  const pillCopy = useMemo(
    () => getPastoralPillCopy(intent, pastorName, biblicalReference),
    [intent, pastorName, biblicalReference]
  );

  const handleCallCVV = () => {
    Linking.openURL('tel:188').catch((err) => {
      console.warn('Erro ao discar para o CVV 188:', err);
    });
  };

  const getPillarBadge = () => {
    switch (intent) {
      case 'CRISIS':
        return 'SINAL DO ATALAIA · COBERTURA';
      case 'THEOLOGICAL_QUERY':
        return 'ESTUDO BÍBLICO · DISCIPULADO';
      case 'THANKSGIVING':
        return 'AÇÃO DE GRAÇAS · GRATIDÃO';
      case 'ANSWERED_PRAYER':
        return 'ORAÇÃO RESPONDIDA · CELEBRAÇÃO';
    }
  };

  const getIconName = (): keyof typeof Feather.glyphMap => {
    switch (intent) {
      case 'CRISIS':
        return 'heart';
      case 'THEOLOGICAL_QUERY':
        return 'book-open';
      case 'THANKSGIVING':
        return 'sun';
      case 'ANSWERED_PRAYER':
        return 'check-circle';
      default:
        return 'message-circle';
    }
  };

  return (
    <View style={[s.container, containerStyle]}>
      {/* Cabeçalho Solene com Ícone do Pilar e Fechamento */}
      <View style={s.headerRow}>
        <View style={s.iconBox}>
          <Feather name={getIconName()} size={16} color={colors.amber.DEFAULT} />
        </View>

        <View style={s.titleWrap}>
          <Text style={s.badgeText}>{getPillarBadge()}</Text>
          <Text style={s.title}>{pillCopy.title}</Text>
        </View>

        <TouchableOpacity
          onPress={onDismiss}
          style={s.dismissBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      {/* Pergunta Canônica Formatada */}
      <Text style={s.promptText}>{pillCopy.prompt}</Text>

      {/* Garantia Silenciosa de Confidencialidade */}
      <Text style={s.disclaimerText}>
        Nenhuma anotação privada é enviada. Seu pastor recebe uma notificação nobre e discreta
        conforme este pilar.
      </Text>

      {/* Barra de Ações / Pílula Principal */}
      <View style={s.actionsContainer}>
        <View style={s.actionsRow}>
          <TouchableOpacity
            onPress={() => onSend(intent)}
            style={s.primaryPillBtn}
            activeOpacity={0.85}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.text.onAmber} />
            ) : (
              <>
                <Feather name="mail" size={14} color={colors.text.onAmber} />
                <Text style={s.primaryPillText}>{pillCopy.buttonLabel}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Se for CRISIS, exibir também suporte discreto do CVV */}
          {intent === 'CRISIS' && (
            <TouchableOpacity
              onPress={handleCallCVV}
              style={s.secondaryPillBtn}
              activeOpacity={0.8}
            >
              <Feather name="phone" size={14} color={colors.text.primary} />
              <Text style={s.secondaryPillText}>CVV 188</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={onDismiss} style={s.dismissTextBtn} activeOpacity={0.7}>
          <Text style={s.dismissText}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean, intent: PastoralIntent) {
  // Borda com sutil calor conforme o pilar
  let borderAlpha = '0.24';
  if (intent === 'CRISIS') borderAlpha = '0.32';
  if (intent === 'ANSWERED_PRAYER') borderAlpha = '0.36';

  return StyleSheet.create({
    container: {
      backgroundColor: colors.bg.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: isDark
        ? `rgba(231,176,117,${borderAlpha})`
        : `rgba(180,130,70,${borderAlpha})`,
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
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: isDark ? '#2B261D' : '#F7EBDC',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(231,176,117,0.3)' : 'rgba(180,130,70,0.2)',
    },
    titleWrap: {
      flex: 1,
      marginLeft: spacing['2'],
    },
    badgeText: {
      fontSize: 10,
      letterSpacing: 1.2,
      fontWeight: typography.weight.bold,
      color: colors.amber.DEFAULT,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      marginTop: 1,
    },
    dismissBtn: {
      padding: spacing['1'],
    },
    promptText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.primary,
      fontWeight: '500',
    },
    disclaimerText: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.text.muted,
      fontStyle: 'italic',
    },
    actionsContainer: {
      gap: spacing['2'],
      marginTop: spacing['1'],
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['2'],
      flexWrap: 'wrap',
    },
    primaryPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.full,
      paddingHorizontal: spacing['4'],
      paddingVertical: 10,
      minHeight: 40,
    },
    primaryPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.onAmber,
      letterSpacing: 0.2,
    },
    secondaryPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.bg.raised,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      paddingHorizontal: spacing['3'],
      paddingVertical: 10,
      minHeight: 40,
    },
    secondaryPillText: {
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

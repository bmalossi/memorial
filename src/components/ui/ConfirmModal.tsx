import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: keyof typeof Feather.glyphMap;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  visible,
  onClose,
  title,
  message,
  icon = 'help-circle',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  destructive = false,
  loading = false,
}: ConfirmModalProps) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark, destructive), [colors, isDark, destructive]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={!loading ? onClose : undefined}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        {/* Backdrop táctil */}
        <Pressable
          style={s.backdrop}
          onPress={!loading ? onClose : undefined}
          accessibilityLabel="Fechar diálogo"
          accessibilityRole="button"
        />

        {/* Card de Confirmação Sagrado / Editorial */}
        <View style={s.card}>
          {/* Ícone de Destaque */}
          <View style={s.iconWrap}>
            <Feather
              name={icon}
              size={22}
              color={destructive ? colors.error : colors.amber.DEFAULT}
            />
          </View>

          {/* Título & Mensagem */}
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>

          {/* Botões de Ação */}
          <View style={s.actionsRow}>
            {cancelLabel ? (
              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
                style={s.cancelBtn}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text style={s.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
              style={[s.confirmBtn, destructive ? s.confirmBtnDestructive : s.confirmBtnAccent]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={destructive ? '#FFFFFF' : colors.text.onAmber}
                />
              ) : (
                <Text
                  style={[
                    s.confirmText,
                    destructive ? s.confirmTextDestructive : s.confirmTextAccent,
                  ]}
                >
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean, destructive: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing['5'],
      backgroundColor: isDark ? 'rgba(8, 7, 10, 0.76)' : 'rgba(28, 25, 23, 0.52)',
    },

    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },

    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.bg.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: isDark ? colors.border.subtle : colors.border.DEFAULT,
      paddingHorizontal: spacing['6'],
      paddingTop: spacing['6'],
      paddingBottom: spacing['5'],
      alignItems: 'center',
      shadowColor: isDark ? '#000000' : '#2A241C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.5 : 0.16,
      shadowRadius: 24,
      elevation: 16,
    },

    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: destructive
        ? isDark ? 'rgba(209, 91, 91, 0.12)' : 'rgba(201, 74, 74, 0.12)'
        : isDark ? 'rgba(231, 176, 117, 0.12)' : 'rgba(184, 126, 40, 0.12)',
      borderWidth: 1,
      borderColor: destructive
        ? isDark ? 'rgba(209, 91, 91, 0.25)' : 'rgba(201, 74, 74, 0.25)'
        : isDark ? 'rgba(231, 176, 117, 0.25)' : 'rgba(184, 126, 40, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['4'],
    },

    title: {
      color: colors.text.primary,
      fontSize: typography.size.lg,
      fontWeight: typography.weight.bold,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      letterSpacing: 0.1,
      textAlign: 'center',
      marginBottom: spacing['2'],
    },

    message: {
      color: colors.text.secondary,
      fontSize: typography.size.sm,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: spacing['6'],
      paddingHorizontal: spacing['1'],
    },

    actionsRow: {
      flexDirection: 'row',
      width: '100%',
      gap: spacing['3'],
    },

    cancelBtn: {
      flex: 1,
      backgroundColor: isDark ? colors.bg.raised : colors.bg.raised,
      borderRadius: radius.md,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },

    cancelText: {
      color: colors.text.secondary,
      fontSize: typography.size.sm + 1,
      fontWeight: typography.weight.semibold,
      letterSpacing: 0.1,
    },

    confirmBtn: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    confirmBtnAccent: {
      backgroundColor: colors.amber.DEFAULT,
    },

    confirmBtnDestructive: {
      backgroundColor: colors.error,
    },

    confirmText: {
      fontSize: typography.size.sm + 1,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.2,
    },

    confirmTextAccent: {
      color: colors.text.onAmber,
    },

    confirmTextDestructive: {
      color: '#FFFFFF',
    },
  });
}

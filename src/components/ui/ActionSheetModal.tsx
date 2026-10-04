import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius } from '../../theme';

export interface ActionSheetItem {
  id: string;
  label: string;
  description?: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'default' | 'accent' | 'destructive' | 'selected';
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

interface ActionSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  items: ActionSheetItem[];
  cancelLabel?: string;
}

export function ActionSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  items,
  cancelLabel = 'Cancelar',
}: ActionSheetModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        {/* Backdrop táctil para fechar */}
        <Pressable
          style={s.backdrop}
          onPress={onClose}
          accessibilityLabel="Fechar menu de opções"
          accessibilityRole="button"
        />

        {/* Bottom Sheet com design editorial */}
        <View
          style={[
            s.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing['4']),
            },
          ]}
        >
          {/* Alça decorativa de puxar */}
          <View style={s.handleWrap}>
            <View style={s.handle} />
          </View>

          {/* Cabeçalho do Menu */}
          {(title || subtitle) && (
            <View style={s.header}>
              {title && <Text style={s.title}>{title}</Text>}
              {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
            </View>
          )}

          {/* Lista de Ações */}
          <View style={s.itemsContainer}>
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              const isDestructive = item.variant === 'destructive';
              const isAccent = item.variant === 'accent';
              const isSelected = item.variant === 'selected' || !!item.selected;

              const iconColor = isDestructive
                ? colors.error
                : isAccent || isSelected
                ? colors.amber.DEFAULT
                : colors.text.secondary;

              const labelColor = isDestructive
                ? colors.error
                : isAccent || isSelected
                ? colors.amber.DEFAULT
                : colors.text.primary;

              return (
                <View key={item.id}>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      // Pequeno delay para a animação do modal fechar fluidamente
                      setTimeout(() => {
                        item.onPress();
                      }, 120);
                    }}
                    disabled={item.disabled}
                    activeOpacity={0.7}
                    style={[
                      s.itemRow,
                      isSelected && s.itemRowSelected,
                      item.disabled && s.itemDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    {item.icon && (
                      <View
                        style={[
                          s.itemIconWrap,
                          isDestructive && s.itemIconWrapDestructive,
                          (isAccent || isSelected) && s.itemIconWrapAccent,
                        ]}
                      >
                        <Feather name={item.icon} size={18} color={iconColor} />
                      </View>
                    )}

                    <View style={s.itemTextWrap}>
                      <Text style={[s.itemLabel, { color: labelColor }]}>
                        {item.label}
                      </Text>
                      {item.description && (
                        <Text style={s.itemDesc}>{item.description}</Text>
                      )}
                    </View>

                    {isSelected ? (
                      <Feather name="check" size={18} color={colors.amber.DEFAULT} />
                    ) : (
                      <Feather name="chevron-right" size={16} color={colors.border.DEFAULT} />
                    )}
                  </TouchableOpacity>

                  {!isLast && <View style={s.divider} />}
                </View>
              );
            })}
          </View>

          {/* Botão Cancelar */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={s.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          >
            <Text style={s.cancelBtnText}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: isDark ? 'rgba(8, 7, 10, 0.72)' : 'rgba(28, 25, 23, 0.48)',
    },

    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },

    sheet: {
      backgroundColor: colors.bg.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: isDark ? colors.border.subtle : colors.border.DEFAULT,
      paddingHorizontal: spacing['5'],
      paddingTop: spacing['3'],
      shadowColor: isDark ? '#000000' : '#2A241C',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: isDark ? 0.45 : 0.15,
      shadowRadius: 18,
      elevation: 20,
    },

    handleWrap: {
      alignItems: 'center',
      paddingVertical: spacing['2'],
      marginBottom: spacing['2'],
    },

    handle: {
      width: 36,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: colors.border.DEFAULT,
    },

    header: {
      marginBottom: spacing['4'],
      paddingHorizontal: spacing['1'],
    },

    title: {
      color: colors.text.primary,
      fontSize: typography.size.base,
      fontWeight: typography.weight.bold,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      letterSpacing: 0.2,
      marginBottom: 3,
    },

    subtitle: {
      color: colors.text.secondary,
      fontSize: typography.size.xs,
      lineHeight: 18,
    },

    itemsContainer: {
      backgroundColor: isDark ? colors.bg.raised : colors.bg.base,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      overflow: 'hidden',
      marginBottom: spacing['4'],
    },

    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: spacing['4'],
      gap: spacing['3'],
    },

    itemRowSelected: {
      backgroundColor: isDark ? 'rgba(231, 176, 117, 0.08)' : 'rgba(184, 126, 40, 0.08)',
    },

    itemDisabled: {
      opacity: 0.4,
    },

    itemIconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },

    itemIconWrapAccent: {
      backgroundColor: isDark ? 'rgba(231, 176, 117, 0.12)' : 'rgba(184, 126, 40, 0.12)',
      borderColor: isDark ? 'rgba(231, 176, 117, 0.30)' : 'rgba(184, 126, 40, 0.30)',
    },

    itemIconWrapDestructive: {
      backgroundColor: isDark ? 'rgba(209, 91, 91, 0.12)' : 'rgba(201, 74, 74, 0.12)',
      borderColor: isDark ? 'rgba(209, 91, 91, 0.25)' : 'rgba(201, 74, 74, 0.25)',
    },

    itemTextWrap: {
      flex: 1,
    },

    itemLabel: {
      fontSize: typography.size.sm + 1,
      fontWeight: typography.weight.medium,
      letterSpacing: 0.1,
    },

    itemDesc: {
      color: colors.text.muted,
      fontSize: typography.size.xs,
      marginTop: 2,
    },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border.DEFAULT,
      marginLeft: 52, // alinhado com o texto
    },

    cancelBtn: {
      backgroundColor: isDark ? colors.bg.raised : colors.bg.raised,
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },

    cancelBtnText: {
      color: colors.text.secondary,
      fontSize: typography.size.sm + 1,
      fontWeight: typography.weight.semibold,
      letterSpacing: 0.2,
    },
  });
}

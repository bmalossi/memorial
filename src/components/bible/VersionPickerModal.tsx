import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, ColorTokens, typography, spacing, radius, getThemedShadows } from '../../theme';
import { BIBLE_VERSIONS, BibleVersion } from '../../lib/bibleData';

interface Props {
  visible: boolean;
  currentVersion: BibleVersion;
  onClose: () => void;
  onSelectVersion: (version: BibleVersion) => void;
}

export function VersionPickerModal({
  visible,
  currentVersion,
  onClose,
  onSelectVersion,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                s.sheet,
                {
                  paddingBottom: Math.max(insets.bottom + 12, 28),
                },
              ]}
            >
              {/* Barra de arrasto visual */}
              <View style={s.handle} />

              {/* Cabeçalho */}
              <View style={s.header}>
                <View style={s.headerTextWrap}>
                  <Text style={s.title}>Versão da Bíblia</Text>
                  <Text style={s.subtitle}>
                    Selecione a tradução para leitura das Escrituras
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={s.closeBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar seletor de versões"
                >
                  <Feather name="x" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Lista de Versões */}
              <View style={s.versionList}>
                {BIBLE_VERSIONS.map((item) => {
                  const isSelected = item.id === currentVersion;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        onSelectVersion(item.id);
                        onClose();
                      }}
                      activeOpacity={0.8}
                      style={[
                        s.versionCard,
                        isSelected && s.versionCardSelected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${item.label} - ${item.name}`}
                    >
                      {/* Badge da Sigla */}
                      <View
                        style={[
                          s.badge,
                          isSelected && s.badgeSelected,
                        ]}
                      >
                        <Text
                          style={[
                            s.badgeText,
                            isSelected && s.badgeTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>

                      {/* Informações da Tradução */}
                      <View style={s.cardBody}>
                        <View style={s.titleRow}>
                          <Text
                            style={[
                              s.versionName,
                              isSelected && s.versionNameSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </View>
                        <Text style={s.versionDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>

                      {/* Indicador de Seleção */}
                      <View
                        style={[
                          s.radio,
                          isSelected && s.radioSelected,
                        ]}
                      >
                        {isSelected && (
                          <Feather
                            name="check"
                            size={14}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean) {
  const shadows = getThemedShadows(isDark);

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bg.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing['3'],
      paddingHorizontal: spacing['5'],
      borderWidth: 1,
      borderColor: colors.border.subtle,
      ...shadows.sheet,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: colors.border.DEFAULT,
      alignSelf: 'center',
      marginBottom: spacing['3'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing['4'],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
      marginBottom: spacing['4'],
    },
    headerTextWrap: {
      flex: 1,
      paddingRight: spacing['3'],
      gap: 2,
    },
    title: {
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: typography.weight.bold,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    subtitle: {
      color: colors.text.muted,
      fontSize: typography.size.xs,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: colors.bg.raised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    versionList: {
      gap: spacing['3'],
    },
    versionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: radius.md,
      backgroundColor: colors.bg.raised,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      gap: spacing['3'],
    },
    versionCardSelected: {
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(217, 119, 6, 0.08)',
      borderColor: colors.amber.DEFAULT,
    },
    badge: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: colors.bg.base,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeSelected: {
      backgroundColor: colors.amber.DEFAULT,
      borderColor: colors.amber.DEFAULT,
    },
    badgeText: {
      color: colors.text.secondary,
      fontSize: 13,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.5,
    },
    badgeTextSelected: {
      color: '#FFFFFF',
    },
    cardBody: {
      flex: 1,
      gap: 3,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    versionName: {
      color: colors.text.primary,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.semibold,
    },
    versionNameSelected: {
      color: colors.amber.DEFAULT,
      fontWeight: typography.weight.bold,
    },
    versionDesc: {
      color: colors.text.muted,
      fontSize: 11,
      lineHeight: 15,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      backgroundColor: colors.amber.DEFAULT,
      borderColor: colors.amber.DEFAULT,
    },
  });
}

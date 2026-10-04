import React, { useRef, useMemo } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme, ColorTokens, typography, radius, spacing, getThemedShadows, components } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'right',
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const s = useMemo(() => getButtonStyles(colors, isDark), [colors, isDark]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        fullWidth && { width: '100%' },
      ]}
    >
      <Pressable
        onPress={!isDisabled ? onPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          s.base,
          s[variant],
          isDisabled && s.disabled,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.text.onAmber : colors.amber.DEFAULT}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && <>{icon}</>}
            <Text style={[s.label, s[`${variant}Label` as keyof typeof s], textStyle]}>
              {label}
            </Text>
            {icon && iconPosition === 'right' && <>{icon}</>}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function getButtonStyles(colors: ColorTokens, isDark: boolean) {
  const themedShadows = getThemedShadows(isDark);
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: components.button.primary.height,
      borderRadius: components.button.primary.borderRadius,
      paddingHorizontal: spacing['6'],
      gap: spacing['2'],
      ...themedShadows.amber,
    },

    primary: {
      backgroundColor: colors.amber.DEFAULT,
    },

    secondary: {
      backgroundColor: colors.bg.raised,
      borderWidth: 1,
      borderColor: colors.border.active,
      shadowOpacity: 0,
      elevation: 0,
    },

    ghost: {
      backgroundColor: colors.transparent,
      shadowOpacity: 0,
      elevation: 0,
    },

    label: {
      fontSize: typography.size.md,
      fontWeight: typography.weight.semibold,
      letterSpacing: 0.2,
    },

    primaryLabel: {
      color: colors.text.onAmber,
    },

    secondaryLabel: {
      color: isDark ? colors.amber.light : colors.amber.DEFAULT,
    },

    ghostLabel: {
      color: colors.text.secondary,
    },

    disabled: {
      opacity: 0.45,
    },
  });
}

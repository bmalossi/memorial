import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme, ColorTokens, typography, radius, spacing, components } from '../../theme';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function InputField({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...props
}: InputFieldProps) {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const s = useMemo(() => getFieldStyles(colors, isDark), [colors, isDark]);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    props.onFocus?.(null as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    props.onBlur?.(null as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.error : colors.border.DEFAULT,
      error ? colors.error : colors.border.active,
    ],
  });

  const labelColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.error : colors.text.secondary,
      error ? colors.error : (isDark ? colors.amber.light : colors.amber.DEFAULT),
    ],
  });

  return (
    <View style={[s.container, containerStyle]}>
      <Animated.Text style={[s.label, { color: labelColor }]}>
        {label}
      </Animated.Text>

      <Animated.View style={[s.fieldWrapper, { borderColor }]}>
        {leftIcon && <View style={s.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[s.input, leftIcon ? s.inputWithLeft : null]}
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.amber.DEFAULT}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={s.rightIcon}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
          >
            {rightIcon}
          </Pressable>
        )}
      </Animated.View>

      {error ? (
        <Text style={s.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function getFieldStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
    container: {
      width: '100%',
      gap: spacing['1'],
    },

    label: {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
      letterSpacing: 0.1,
      marginBottom: 2,
    },

    fieldWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg.raised,
      borderRadius: components.input.borderRadius,
      borderWidth: 1,
      minHeight: components.input.height,
      shadowColor: isDark ? '#000' : '#3A3228',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.15 : 0.04,
      shadowRadius: 3,
      elevation: 2,
    },

    input: {
      flex: 1,
      color: colors.text.primary,
      fontSize: typography.size.base,
      fontWeight: typography.weight.regular,
      paddingVertical: spacing['3'],
      paddingHorizontal: spacing['4'],
    } as any,

    inputWithLeft: {
      paddingLeft: spacing['2'],
    },

    leftIcon: {
      paddingLeft: spacing['4'],
      opacity: 0.7,
    },

    rightIcon: {
      paddingRight: spacing['4'],
      opacity: 0.7,
    },

    errorText: {
      color: colors.error,
      fontSize: typography.size.xs,
      fontWeight: typography.weight.medium,
      marginTop: 2,
    },
  });
}
